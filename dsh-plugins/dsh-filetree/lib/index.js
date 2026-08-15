import { readFile, readdir, stat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

/**
 * dsh-filetree — host plugin.
 *
 * Registers a read-only JSON listing service on the dsh web server so the
 * browser client can render the current workspace's file structure:
 *
 *   GET /filetree/list?path=<absolute>  ->  { ok, path, entries, truncated }
 *   GET /filetree/root                 ->  { ok, cwd }
 *
 * Entries are sorted (directories first, then files, case-insensitive by
 * name), stat'd for size/mtime, and flagged hidden when the name starts
 * with a dot. Only absolute paths are accepted. Nothing here is model-
 * facing: the route is a GUI-only read surface, so no prompt impact.
 */

const name = "dsh-filetree";
const inject = ["webServer"];
const MAX_ENTRIES = 1000;

/** Sort rows: directories before files, then case-insensitive by name. */
function compareRows(a, b) {
  if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
  const al = a.name.toLowerCase();
  const bl = b.name.toLowerCase();
  return al < bl ? -1 : al > bl ? 1 : 0;
}

/**
 * List one directory level. Broken symlinks and unreadable sub-entries are
 * tolerated (stat failure degrades the row rather than failing the listing).
 * Per-entry stats run through a bounded-concurrency pool so listings stay
 * fast even for directories with hundreds of entries (the browser shows a
 * "loading" row while this is in flight — the pool keeps that window tiny).
 */
async function listDirectory(pathValue) {
  const dirents = await readdir(pathValue, { withFileTypes: true });
  const rows = [];
  let truncated = false;
  for (const d of dirents) {
    if (rows.length >= MAX_ENTRIES) {
      truncated = true;
      break;
    }
    rows.push({ dirent: d, stat: null });
  }
  // Bounded-concurrency stat pool (plain directories already classify via
  // dirent and skip the filesystem call entirely).
  let cursor = 0;
  const workers = Math.min(48, rows.length);
  const runWorker = async () => {
    while (true) {
      const at = cursor;
      if (at >= rows.length) return;
      cursor += 1;
      const row = rows[at];
      const d = row.dirent;
      if (d.isDirectory()) continue; // no size needed; kind is known
      try {
        row.stat = await stat(join(pathValue, d.name));
      } catch {
        // broken link / race / permission — row still shows with kind fallback
      }
    }
  };
  await Promise.all(Array.from({ length: workers }, () => runWorker()));
  const entries = rows.map(({ dirent: d, stat: s }) => {
    const kind = d.isDirectory() || s?.isDirectory() ? "dir" : "file";
    return {
      name: d.name,
      kind,
      size: kind === "file" && s ? s.size : 0,
      mtime: s ? s.mtimeMs : 0,
      hidden: d.name.startsWith(".")
    };
  });
  entries.sort(compareRows);
  return { entries, truncated };
}

/**
 * Recursive basename search under a root. Bounded: depth, scanned-entry and
 * result caps keep the walk cheap; .git and node_modules are skipped (the
 * tree itself still shows them — this is a find box, not a du walk).
 */
async function searchDirectory(root, query) {
  const q = query.toLowerCase();
  const results = [];
  const MAX_SCAN = 4000;
  const MAX_RESULTS = 200;
  const MAX_DEPTH = 14;
  const queue = [{ dir: root, depth: 0 }];
  let scanned = 0;
  while (queue.length > 0 && scanned < MAX_SCAN && results.length < MAX_RESULTS) {
    const { dir, depth } = queue.shift();
    let dirents;
    try {
      dirents = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const d of dirents) {
      if (scanned >= MAX_SCAN || results.length >= MAX_RESULTS) break;
      scanned += 1;
      const full = join(dir, d.name);
      const name = d.name;
      const hit = name.toLowerCase().includes(q);
      if (d.isDirectory()) {
        if (name === ".git" || name === "node_modules") continue;
        if (depth < MAX_DEPTH) queue.push({ dir: full, depth: depth + 1 });
        if (hit) results.push({ path: full, name, kind: "dir" });
      } else if (hit) {
        results.push({ path: full, name, kind: "file" });
      }
    }
  }
  return results;
}

/** JSON helper with the no-store header so live refresh never hits a cache. */
function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

/**
 * Plugin body: register the /filetree prefix route for the lifetime of the
 * fiber (disposed automatically on unload).
 * @param ctx - host plugin context with the webServer service.
 */
function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: "/filetree",
    handler: async (req, res) => {
      try {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (url.pathname === "/filetree/root") {
          json(res, 200, { ok: true, cwd: process.cwd() });
          return;
        }
        if (url.pathname === "/filetree/list") {
          const pathValue = url.searchParams.get("path") ?? "";
          if (pathValue === "" || !isAbsolute(pathValue)) {
            json(res, 400, {
              ok: false,
              error: { code: "invalid-path", message: "an absolute path is required" }
            });
            return;
          }
          try {
            const result = await listDirectory(pathValue);
            json(res, 200, { ok: true, path: pathValue, ...result });
          } catch (error) {
            json(res, 200, {
              ok: false,
              path: pathValue,
              error: {
                code: error?.code ?? "list-failed",
                message: error instanceof Error ? error.message : String(error)
              }
            });
          }
          return;
        }
        if (url.pathname === "/filetree/read") {
          const pathValue = url.searchParams.get("path") ?? "";
          if (pathValue === "" || !isAbsolute(pathValue)) {
            json(res, 400, { ok: false, error: { code: "invalid-path", message: "an absolute path is required" } });
            return;
          }
          try {
            const s = await stat(pathValue);
            if (s.isDirectory()) {
              json(res, 200, { ok: false, error: { code: "is-directory", message: "path is a directory" } });
              return;
            }
            const MAX = 512 * 1024;
            const buf = await readFile(pathValue);
            const truncated = buf.length > MAX;
            const slice = truncated ? buf.subarray(0, MAX) : buf;
            if (slice.includes(0)) {
              json(res, 200, { ok: true, binary: true, size: buf.length, truncated });
              return;
            }
            json(res, 200, { ok: true, binary: false, content: slice.toString("utf8"), size: buf.length, truncated });
          } catch (error) {
            json(res, 200, {
              ok: false,
              error: {
                code: error?.code ?? "read-failed",
                message: error instanceof Error ? error.message : String(error)
              }
            });
          }
          return;
        }
        if (url.pathname === "/filetree/search") {
          const pathValue = url.searchParams.get("path") ?? "";
          const q = (url.searchParams.get("q") ?? "").trim();
          if (pathValue === "" || !isAbsolute(pathValue)) {
            json(res, 400, { ok: false, error: { code: "invalid-path", message: "an absolute path is required" } });
            return;
          }
          if (q === "" || q.length > 200) {
            json(res, 400, { ok: false, error: { code: "invalid-query", message: "a non-blank query of at most 200 chars is required" } });
            return;
          }
          try {
            const results = await searchDirectory(pathValue, q);
            json(res, 200, { ok: true, query: q, results });
          } catch (error) {
            json(res, 200, {
              ok: false,
              path: pathValue,
              error: {
                code: error?.code ?? "search-failed",
                message: error instanceof Error ? error.message : String(error)
              }
            });
          }
          return;
        }
        res.writeHead(404);
        res.end();
      } catch (error) {
        ctx.logger.warn(error);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end();
        } else {
          res.destroy();
        }
      }
    }
  }), "dsh-filetree: /filetree routes");
}

export { apply, inject, name };
