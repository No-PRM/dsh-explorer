[English](README.md) · [中文](README.zh-CN.md)

# dsh-explorer

Host half of the collapsible real-time file-tree sidebar for the dsh web GUI.
Read-only JSON endpoints over the dsh web server — the browser client's only
bridge to the local filesystem and git.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /filetree/list?path=<absolute>` | List one directory level: `{ ok, path, entries: [{ name, kind, size, mtime, hidden }], truncated }`. Directories-first, case-insensitive sort; dot-entries flagged `hidden`; bounded-concurrency stat pool (48 workers). |
| `GET /filetree/root` | The host process `cwd` (`{ ok, cwd }`). |
| `GET /filetree/read?path=<absolute>` | Read a file for preview: 512 KB cap (`truncated`), NUL-byte binary detection, UTF-8 content. |
| `GET /filetree/search?path=<absolute>&q=<query>` | Recursive basename search (bounded: 4000 scans / 200 results / depth 14; skips `.git` + node_modules). |
| `GET /filetree/raw?path=<absolute>` | Stream a file for media preview (`image/*`, `video/*`, `audio/*`, PDF): proper content-type, `Accept-Ranges` + `Range` support (206 partial content for video seeking). No size cap. |
| `GET /filetree/gitdiff?path=<absolute>` | HEAD vs working-tree content for the preview diff: `{ ok, git, base, current, same, binary }` (512 KB cap, binary → empty). |
| `GET /filetree/gitstatus?path=<absolute>` | Git status for decorations: `{ ok, git, root, entries: [{ path, status, x, y }], truncated? }`. Status letters A/M/D/R/C/U/T (`I` = ignored); repo root found via `rev-parse --show-toplevel`; ignored entries from a collapsed `--ignored` pass (fast even with huge ignored trees); 2 s TTL cache. Non-repo / git-missing → `{ git: false }`. |

- Only absolute paths are accepted (relative paths get `400 invalid-path`).
- Broken symlinks / unreadable sub-entries degrade to a row instead of failing.
- One level per call — the browser renders the tree lazily.
- GUI-only read surface: nothing here reaches the model prompt.
- **Zero runtime dependencies** (node:fs, node:path, node:child_process only).

## Install

Mounted as a cordis row in the web profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: filetree
      name: dsh-explorer
```

The package lives in `~/.dsh/profiles/web/node_modules/dsh-explorer`
(resolution base of the profile).

> **Live-deploy note:** host code changes do not hot-reload. To activate an
> edit without restarting the app, bump the package name (e.g. copy to
> `dsh-explorer-v1`, update the `name:` above) — the fresh module id loads
> on the next patch re-apply. A restart also works.
