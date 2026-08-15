[English](README.md) · [中文](README.zh-CN.md)

# dsh-filetree — file-tree sidebar for DeepSeek Harness

A **collapsible, real-time file-tree sidebar** for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web GUI — a floating DeepSeek-blue round button on the right edge opens a drawer that shows the current workspace's file structure, with VS Code-grade explorer behavior. **100% pure plugin**: nothing inside the shipped dsh packages is modified, so dsh upgrades can never break it.

## Features

- **Right-side drawer** (264–720 px, drag-to-resize) + floating DeepSeek-blue round toggle (> / <), 0.45 s no-bounce slide, persisted open/width state
- **Lazy virtualized tree** (@tanstack/virtual-core): only visible rows are rendered, huge folders stay smooth
- **VS Code-style indent guides** with hover highlight, hidden VCS internals (`.git`/`.svn`/`.hg`/`CVS`, `.DS_Store`/`Thumbs.db`) per `files.exclude` defaults
- **Git decorations**: M/A/U/D/R status letters in a fixed right-hand column, filename tinting, folder dirty dots, deleted files as struck-through ghost rows, gitignored files/dirs dimmed
- **Media preview**: images / video / audio / PDF stream natively (Range-enabled, video seeking works); text previews in a CodeMirror 6 editor with a VS Code-style find widget (Ctrl+F)
- **Drag & drop**: drag any file/folder row into the chat composer to insert a Codex-style `@relative-path` reference
- Search (skips `.git`/node_modules), expand/collapse-all, 1.2 s live refresh
- Bilingual docs (English / 中文)

## Architecture — two pure plugins

| Package | Role |
| --- | --- |
| `dsh-filetree` | **Host plugin** (Node): read-only `/filetree/*` JSON API over the dsh web server — directory listing, file read, recursive search, git status, raw media streaming. Zero runtime dependencies. |
| `dsh-client-ui-filetree` | **Browser plugin** (TS/TSX): the floating toggle + right drawer — virtualized tree, guides, git decorations, CodeMirror preview, drag-to-reference. |

Both follow the official dsh plugin contract (`dsh.client` + `exports["./client"]`, Cordis entry, zero declared `@deepseek-ai/*` deps). See [dsh-plugins/README.md](dsh-plugins/README.md) for wiring and the full official-form notes.

## Install

Both halves are required. Copy the two packages into a profile's `node_modules`, then add both to its `cordis.patch.yml`:

```yaml
- insert:
    - id: filetree
      name: dsh-filetree-v5     # host — bump the suffix to deploy without restart
    - id: ui-filetree
      name: dsh-client-ui-filetree
```

Restart dsh (or use the versioned-name trick for the host). The browser bundle is self-contained — **no `npm install` needed by consumers**. Detailed steps: [dsh-plugins/README.md](dsh-plugins/README.md).

## Development

```bash
cd dsh-plugins/dsh-client-ui-filetree
npm run dev        # tsdown --watch + live sync into the running profile
npm run bundle     # one-shot minified build (oxc)
npm run types      # generate lib/types/*.d.ts declarations
npm run typecheck  # tsc --noEmit
```

Host edits go into `dsh-plugins/dsh-filetree/lib/index.js`; deploy to the profile under a bumped package name (e.g. `dsh-filetree-v6`) for a no-restart reload.

## Docs

- [dsh-plugins/README.md](dsh-plugins/README.md) — architecture, install, deploy, dev (English · [中文](dsh-plugins/README.zh-CN.md))
- [dsh-client-ui-filetree/README.md](dsh-plugins/dsh-client-ui-filetree/README.md) — browser plugin (English · [中文](dsh-plugins/dsh-client-ui-filetree/README.zh-CN.md))
- [dsh-filetree/README.md](dsh-plugins/dsh-filetree/README.md) — host plugin endpoints (English · [中文](dsh-plugins/dsh-filetree/README.zh-CN.md))

## License

MIT
