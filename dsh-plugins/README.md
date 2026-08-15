[English](README.md) · [中文](README.zh-CN.md)

# dsh-plugins — collapsible real-time file-tree sidebar for the DSH web GUI

Two small packages that add a **可折叠文件树侧栏** (collapsible file-tree sidebar) to
the DeepSeek Harness web GUI — the tree lives in a **right-side panel**, toggled by
a **floating DeepSeek-blue round button** (> / <) on the right-middle of the
conversation column:

| Package | Role |
| --- | --- |
| `dsh-explorer` | **Host plugin** (Node): serves the read-only `/filetree/*` JSON API over the dsh web server — directory listing, file read, recursive search, git status. **Zero dependencies.** |
| `dsh-client-ui-explorer` | **Browser plugin** (TS/TSX): the floating >/< toggle and the right file-tree drawer — lazy **virtualized** tree, VS Code-style guides, search, CodeMirror preview, **git decorations** (M/A/U/D/R letters, filename tinting, dirty dots, deleted ghost rows, ignored dimming), `files.exclude` defaults. |

## How it is wired in — 100% pure plugin (no invasive patches)

The whole feature is a **drawer overlay** built entirely from the official plugin
pipelines — **nothing inside the shipped dsh packages is modified**, so a dsh
upgrade can never break it:

1. **Host** (`dsh-explorer`, deployed as `dsh-explorer-v1` in this profile): a standard
   cordis plugin mounted through the profile's `cordis.patch.yml`; serves
   `/filetree/list`, `/filetree/root`, `/filetree/read`, `/filetree/search`,
   `/filetree/gitstatus`.
2. `dsh-client-ui-explorer` (browser): a standard client plugin discovered via the
   `dsh.client` declaration. It registers **one entry into the existing
   `shell.overlay` list slot** (`id: "filetree.drawer"`) which renders:
   - the floating DeepSeek-blue round toggle (\> / \<)
   - the right **drawer**: an absolute overlay column (no layout involvement) with
     its own pointer-capture drag handle, the file tree (VS Code-style per-row
     indent guides + hover highlight, virtualization), search, expand/collapse-all,
     click-to-preview (CodeMirror 6), and **git decorations** — M/A/U/D/R letters
     with filename tinting, folder dirty dots, deleted-file ghost rows, gitignored
     dimming, VS Code `files.exclude` defaults
   - open state + width persist in `localStorage` (`dsh.filetree.panel`,
     `dsh.filetree.width`)

The `dsh-client-ui-layout` bundle is **pristine** (reverted from an earlier
invasive prototype — restored byte-for-byte from the npm tarball).

Trade-off vs. a real grid column: the drawer **overlays** the conversation
(which does not reflow); the conversation keeps its width and the drawer covers
its right side.
## Live verify

- Host: `GET http://127.0.0.1:3080/filetree/list?path=D:\\CodeWorkspaces\\测试\\create`
- Boot graph: `GET /` → `window.__DSH_BOOT__` contains `dsh-client-ui-explorer`.

## Official form (2026-08 dsh plugin spec)

Both packages follow the official plugin contract:

- **Host** `dsh-explorer` — pure Cordis entry (`name`/`inject`/`apply` + `main`/`exports["."]`), zero runtime deps; installed via a profile `cordis.patch.yml` insert row (config-HMR, no restart).
- **Browser** `dsh-client-ui-explorer` — declares `dsh.client` (`platform: "web"`, inject edges for locale/runtime/ui-slots) and exports its built bundle at `exports["./client"]` (types at `lib/types/client/index.d.ts`); the package carries a `prepare` script so a git-source install builds `lib/` from `src/`.
- Old mechanisms (`dsh.plugin.json`, `dsh registry`, repository-plugins) were removed upstream in 2026-08 and are not used.

## Install (fresh profile)

**One-line bundle install (recommended):**

```bash
# host
 dsh plugin --profile web add "github:No-PRM/dsh-explorer#main&path:/dsh-plugins/dsh-explorer"
# browser
 dsh plugin --profile web add "github:No-PRM/dsh-explorer#main&path:/dsh-plugins/dsh-client-ui-explorer"
# then restart dsh
```

Both packages ship as official **bundles** (`dsh.bundle.patch` + built `lib/` in the repo, so a git-source install works with no build step).

> **Dev machine?** The `dsh plugin add` channel is for fresh profiles / other users. On a checkout that already runs the **junction + `cordis.patch.yml` insert-row** dev setup, running these commands in the *same* profile would collide (same package names in `node_modules`, plus duplicated plugin rows) — keep one or the other per profile.

**Manual (dev / no-restart):** copy both packages into `~/.dsh/profiles/<profile>/node_modules/` — the
   browser package must contain a **built** `lib/client.js`.
2. Add both to that profile's `cordis.patch.yml`:

   ```yaml
   - insert:
       - id: filetree
         name: dsh-explorer-v1     # host — bump the suffix to deploy without restart
       - id: ui-filetree
         name: dsh-client-ui-explorer
   ```

3. Restart dsh (or use the versioned-name trick for the host so it activates
   without a restart). **No `npm install` is needed by consumers** — the browser
   bundle is self-contained; platform externals (react, primitives) come from the
   dsh loader module table.

## Live verify

- Host: `GET http://127.0.0.1:3080/filetree/list?path=D:/CodeWorkspaces/测试/create`
  and `GET http://127.0.0.1:3080/filetree/gitstatus?path=...`
- Boot graph: `GET /` → `window.__DSH_BOOT__` contains `dsh-client-ui-explorer`.

## Versioning

Two numbers, two jobs:

- **Package semver** (`0.1.0` in each `package.json`) — the real plugin version for distribution; bump both packages in lockstep for feature/minor releases.
- **Local deploy suffix** (`dsh-explorer-v1`) — a per-machine counter for no-restart host deploys (copy to a bumped name so the fresh module id loads). Not a semver.

For GitHub distribution, prefer pinning installs to a release tag over a branch:

```bash
 dsh plugin --profile web add "github:No-PRM/dsh-explorer#v0.1.0&path:/dsh-plugins/dsh-explorer"
```

## Dev

- Sources live in this directory; the installed copies are at
  `~/.dsh/profiles/web/node_modules/` — the browser install is a **junction** to
  the source (build → hot-reloads); the host is a copy.
- Browser: `cd dsh-client-ui-explorer && npm run dev` (watch + sync),
  `npm run bundle` (minified one-shot), `npm run types` (declarations to
  `lib/types/`), `npm run typecheck`.
- Host: edit `dsh-explorer/lib/index.js`, then copy to
  `node_modules/dsh-explorer-v<N>/lib/index.js` with a bumped name for a
  no-restart deploy.
