import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative as pathRelative } from "node:path";
import { execFile } from "node:child_process";

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

const name = "dsh-explorer";
const inject = ["webServer"];
const MAX_ENTRIES = 1000;
/**
 * Git status for the workspace (VS Code-style file decorations).
 *
 *   GET /filetree/gitstatus?path=<absolute>  ->  { ok, git, root, entries, truncated? }
 *
 * entries[i] = { path: <absolute>, status, x, y } where status is the
 * single display letter (A/M/D/R/C/U/T), x/y the porcelain index/worktree
 * codes. A 2s TTL cache per repo root keeps the client's 1.2s poll from
 * hammering git. Non-repo / git-missing paths resolve to { git: false }.
 */
const GIT_CACHE_TTL = 2000;
const MAX_GIT_ENTRIES = 2000;
/** Extension -> content type for the raw media stream (best-effort). */
const MIME_BY_EXT = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".bmp": "image/bmp", ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4", ".webm": "video/webm", ".ogv": "video/ogg", ".mov": "video/quicktime", ".m4v": "video/mp4",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".oga": "audio/ogg", ".m4a": "audio/mp4",
  ".flac": "audio/flac", ".aac": "audio/aac", ".opus": "audio/opus",
  ".pdf": "application/pdf"
};

function contentTypeFor(pathValue) {
  const dot = pathValue.lastIndexOf(".");
  const ext = dot >= 0 ? pathValue.slice(dot).toLowerCase() : "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

const gitCache = new Map(); // repo root -> { at, payload }

function runGit(args) {
  return new Promise((resolve) => {
    execFile("git", args, { timeout: 4000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
      if (err) {
        resolve({ ok: false, code: err.code, stdout: String(stdout ?? "") });
        return;
      }
      resolve({ ok: true, stdout: String(stdout) });
    });
  });
}

async function gitStatus(pathValue) {
  const top = await runGit(["-C", pathValue, "rev-parse", "--show-toplevel"]);
  if (!top.ok) {
    return { git: false, reason: top.code === "ENOENT" ? "git-not-found" : "not-a-repo" };
  }
  const root = top.stdout.trim();
  if (!root) return { git: false, reason: "no-root" };
  const cached = gitCache.get(root);
  if (cached && Date.now() - cached.at < GIT_CACHE_TTL) return cached.payload;
  const payload = { git: true, root };
  const entries = [];
  /* Pass 1 — tracked changes / untracked files. */
  const out = await runGit(["-C", root, "--no-optional-locks", "status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  if (out.ok) {
    if (out.stdout) {
      const tokens = out.stdout.split("\0");
      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        if (!tok) continue;
        const x = tok[0] ?? " ";
        const y = tok[1] ?? " ";
        let rel = tok.slice(3);
        if (x === "R" || x === "C") {
          const next = tokens[i + 1];
          if (next) {
            rel = next;
            i += 1;
          }
        }
        if (!rel) continue;
        const status = x !== " " && x !== "?" ? x : y !== " " && y !== "?" ? y : "U";
        entries.push({ path: join(root, rel), status, x, y });
        if (entries.length >= MAX_GIT_ENTRIES) {
          payload.truncated = true;
          break;
        }
      }
    }
    /* Pass 2 — ignored entries (default mode collapses ignored dirs, so this
       stays fast even with huge ignored trees like node_modules). */
    if (!payload.truncated) {
      const ign = await runGit(["-C", root, "--no-optional-locks", "status", "--ignored", "--porcelain=v1", "-z"]);
      if (ign.ok && ign.stdout) {
        for (const tok of ign.stdout.split("\0")) {
          if (!tok || !tok.startsWith("!! ")) continue;
          const rel = tok.slice(3);
          if (!rel) continue;
          entries.push({ path: join(root, rel), status: "I", x: "!", y: "!" });
          if (entries.length >= MAX_GIT_ENTRIES) {
            payload.truncated = true;
            break;
          }
        }
      }
    }
    payload.entries = entries;
  } else {
    payload.error = { code: out.code ?? "git-status-failed" };
    payload.entries = [];
  }
  gitCache.set(root, { at: Date.now(), payload });
  return payload;
}


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

        if (url.pathname === "/filetree/gitstatus") {
          const pathValue = url.searchParams.get("path") ?? "";
          if (pathValue === "" || !isAbsolute(pathValue)) {
            json(res, 400, { ok: false, error: { code: "invalid-path", message: "an absolute path is required" } });
            return;
          }
          try {
            const result = await gitStatus(pathValue);
            json(res, 200, { ok: true, path: pathValue, ...result });
          } catch (error) {
            json(res, 200, {
              ok: false,
              path: pathValue,
              error: { code: error?.code ?? "git-status-failed", message: error instanceof Error ? error.message : String(error) }
            });
          }
          return;
        }

        if (url.pathname === "/filetree/raw") {
          const pathValue = url.searchParams.get("path") ?? "";
          if (pathValue === "" || !isAbsolute(pathValue)) {
            json(res, 400, { ok: false, error: { code: "invalid-path", message: "an absolute path is required" } });
            return;
          }
          try {
            const s = await stat(pathValue);
            if (!s.isFile()) {
              json(res, 400, { ok: false, error: { code: "not-a-file", message: "path is not a file" } });
              return;
            }
            const type = contentTypeFor(pathValue);
            res.setHeader("content-type", type);
            res.setHeader("accept-ranges", "bytes");
            res.setHeader("cache-control", "no-store");
            const range = (req.headers.range ?? "").match(/bytes=(\d*)-(\d*)/);
            const total = s.size;
            if (range) {
              const start = range[1] === "" ? Math.max(0, total - Number(range[2] || 0)) : Number(range[1]);
              const end = range[2] === "" ? total - 1 : Math.min(Number(range[2]), total - 1);
              if (start >= total || start > end) {
                res.writeHead(416, { "content-range": "bytes */" + total });
                res.end();
                return;
              }
              res.writeHead(206, {
                "content-range": "bytes " + start + "-" + end + "/" + total,
                "content-length": end - start + 1
              });
              if (req.method === "HEAD") { res.end(); return; }
              createReadStream(pathValue, { start, end }).pipe(res);
            } else {
              res.writeHead(200, { "content-length": total });
              if (req.method === "HEAD") { res.end(); return; }
              createReadStream(pathValue).pipe(res);
            }
          } catch (error) {
            json(res, 404, {
              ok: false,
              error: { code: error?.code ?? "raw-failed", message: error instanceof Error ? error.message : String(error) }
            });
          }
          return;
        }

        if (url.pathname === "/filetree/gitdiff") {
          const pathValue = url.searchParams.get("path") ?? "";
          if (pathValue === "" || !isAbsolute(pathValue)) {
            json(res, 400, { ok: false, error: { code: "invalid-path", message: "an absolute path is required" } });
            return;
          }
          try {
            const top = await runGit(["-C", dirname(pathValue), "rev-parse", "--show-toplevel"]);
            if (!top.ok) {
              json(res, 200, { ok: true, git: false });
              return;
            }
            const root = top.stdout.trim();
            const rel = pathRelative(root, pathValue).split("\\").join("/");
            const MAX = 512 * 1024;
            /* HEAD version (git show fails for new/untracked files -> empty). */
            let base = "";
            const show = await runGit(["-C", root, "show", "HEAD:" + rel]);
            if (show.ok && show.stdout) base = show.stdout.length > MAX ? show.stdout.slice(0, MAX) : show.stdout;
            /* Working-tree version. */
            let current = "";
            try {
              const buf = await readFile(pathValue);
              current = buf.length > MAX ? buf.subarray(0, MAX).toString("utf8") : buf.toString("utf8");
            } catch { /* deleted file -> empty current */ }
            const binary = base.includes("\0") || current.includes("\0");
            json(res, 200, {
              ok: true, git: true, path: pathValue,
              base: binary ? "" : base,
              current: binary ? "" : current,
              binary,
              same: base === current
            });
          } catch (error) {
            json(res, 200, {
              ok: false, path: pathValue,
              error: { code: error?.code ?? "gitdiff-failed", message: error instanceof Error ? error.message : String(error) }
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
