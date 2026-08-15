# dsh-filetree

Host half of the collapsible real-time file-tree sidebar for the dsh web GUI.

Registers two read-only JSON endpoints on the dsh web server:

| Endpoint | Purpose |
| --- | --- |
| `GET /filetree/list?path=<absolute>` | List one directory level: `{ ok, path, entries: [{ name, kind, size, mtime, hidden }], truncated }`. Entries are sorted directories-first, case-insensitive; dot-entries are flagged `hidden`. Per-entry `stat` calls run through a bounded-concurrency pool (48 workers). |
| `GET /filetree/root` | The host process `cwd` (`{ ok, cwd }`). |

- Only absolute paths are accepted (relative paths get `400 invalid-path`).
- Broken symlinks / unreadable sub-entries degrade to a row instead of failing the listing.
- One level per call — the browser renders the tree lazily, so only expanded directories are ever listed.
- GUI-only read surface: nothing here reaches the model prompt.

## Install

Mounted as a cordis row in the web profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: filetree
      name: dsh-filetree
```

The package lives in `~/.dsh/profiles/web/node_modules/dsh-filetree` (resolution base of the profile). Cordis HMR reapplies the patch, so it mounts without a restart.
