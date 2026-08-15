# dsh-plugins — collapsible real-time file-tree sidebar for the DSH web GUI

Two small packages that add a **可折叠文件树侧栏** (collapsible file-tree sidebar) to
the DeepSeek Harness web GUI — the tree lives in a **right-side panel**, toggled by
a **floating DeepSeek-blue round button** (> / <) on the right-middle of the
conversation column:

| Package | Role |
| --- | --- |
| `dsh-filetree` | Host plugin: serves `/filetree/list` (one directory level, dirs-first, sizes/mtimes, hidden flags; parallel bounded stat pool) over the dsh web server. |
| `dsh-client-ui-filetree` | Browser plugin: the floating >/< toggle (via `shell.overlay`) and the right file-tree panel (via `filetree.panel`) — current workspace folder, lazy collapsible tree, 1.2 s auto-refresh + focus refresh, manual refresh, close button, drag-to-resize, persisted open/expansion state. |

## How it is wired in — 100% pure plugin (no invasive patches)

The whole feature is a **drawer overlay** built entirely from the official plugin
pipelines — **nothing inside the shipped dsh packages is modified**, so a dsh
upgrade can never break it:

1. `dsh-filetree-v2` (host): a standard cordis plugin mounted through the profile's
   `cordis.patch.yml`; serves `/filetree/list`, `/filetree/search`, `/filetree/read`,
   `/filetree/root`.
2. `dsh-client-ui-filetree` (browser): a standard client plugin discovered via the
   `dsh.client` declaration. It registers **one entry into the existing
   `shell.overlay` list slot** (`id: "filetree.drawer"`) which renders:
   - the floating DeepSeek-blue round toggle (\> / \<)
   - the right **drawer**: an absolute overlay column (no layout involvement) with
     its own pointer-capture drag handle, the file tree (VS Code-style per-row
     indent guides + hover highlight), search, expand/collapse-all, and click-
     to-preview with line numbers
   - open state + width persist in `localStorage` (`dsh.filetree.panel`,
     `dsh.filetree.width`)

The `dsh-client-ui-layout` bundle is **pristine** (reverted from an earlier
invasive prototype — restored byte-for-byte from the npm tarball).

Trade-off vs. a real grid column: the drawer **overlays** the conversation
(which does not reflow); the conversation keeps its width and the drawer covers
its right side.
## Live verify

- Host: `GET http://127.0.0.1:3080/filetree/list?path=D:\\CodeWorkspaces\\测试\\create`
- Boot graph: `GET /` → `window.__DSH_BOOT__` contains `dsh-client-ui-filetree`.

## Sources

Authoring copies live here; the installed copies are at
`~/.dsh/profiles/web/node_modules/` (sync changes by copying `lib/*` over).
The layout shell patch is an edit inside the installed `dsh-client-ui-layout`
client bundle.
