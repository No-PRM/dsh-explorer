# dsh-client-ui-filetree

Collapsible real-time file-tree **drawer** for the dsh web GUI — a 100% pure
plugin (no modifications inside the shipped dsh packages, survives upgrades).

## Features

- Floating DeepSeek-blue round toggle (\> / \<) on the right-middle edge
- Right **drawer** (overlay column with its own drag handle, 264–720 px),
  open/close slide animation (0.45 s, no bounce), button follows the drawer
- Current folder = current session workspace (`cwd`), root expanded by default
- Collapsible tree with **VS Code-style per-row indent guides** + hover
  highlighting (active node's guide line), lazy loading, persisted expansions
- **Virtualized rendering** (@tanstack/virtual-core): only visible rows are
  mounted, so huge folders stay smooth — same guide/hover/preview behavior
- Search box (host `/filetree/search` with client-side BFS fallback), skips
  `.git`/node_modules, click a hit to preview it
- **Git decorations** (VS Code-style): when the workspace is inside a git
  repo, files show M/A/U/D/R status letters with theme colors, folders show a
  dirty dot when their subtree has changes, and deleted files remain visible as
  struck-through ghost rows (host `/filetree/gitstatus`, ~3 s poll)
- Click any file → **CodeMirror 6 read-only preview** (real line numbers,
  selection/copy, dark/light themes, virtualization — no line cap), 512 KB /
  binary detection, 1.2 s live refresh while the drawer is open
- Expand-all / collapse-all (bounded: 150 dirs × depth 6), manual refresh

## Engineering setup (official toolchain)

| File / dir | Purpose |
| --- | --- |
| `src/client/*.ts(x)` | TypeScript/TSX source, split by concern (entry, drawer, panel, tree, virtual, preview, icons, styles, fetch, locales, constants, types) |
| `tsdown.config.ts` | tsdown (rolldown) build: emits `lib/client.js` in the exact `window.__ModuleLoader__.load({ id, factory })` format; react / jsx-runtime / primitives stay external (resolved from the loader module table), everything else is inlined. Defines `process.env.NODE_ENV = "production"` at build time (some deps ship unguarded `process` checks) |
| `tsconfig.json` | strict, `jsx: react-jsx`, `allowImportingTsExtensions` |
| `scripts/dev.mjs` | `npm run dev`: tsdown --watch + junction-aware sync to the live profile install |
| `lib/client.js` | **Build output** (do not hand-edit) |
| `lib/index.js` | Node half (no-op apply; makes the package a loader entry) |

The profile install at `~/.dsh/profiles/web/node_modules/dsh-client-ui-filetree`
is a **junction** to this directory, so building is all it takes to go live:
the client-HMR chain stat-polls the served file and reloads within ~1 s.

## Dev workflow

```bash
npm install        # once
npm run dev        # tsdown --watch + live sync → edit src, save, see it in the GUI
npm run bundle     # one-shot build
npm run typecheck  # tsc --noEmit
```

## Libraries in use (tsdown inlines them)

| Library | Used for |
| --- | --- |
| `@tanstack/virtual-core` | Virtualized tree list (via `src/client/virtual.ts`, a minimal local React adapter — the official `@tanstack/react-virtual` would pull `flushSync`/react-dom, ~1 MB, into the bundle) |
| `@uiw/react-codemirror` (+ CodeMirror 6 core/languages) | **Preview**: a real read-only editor (line numbers, selection/copy, themes, virtualization), replacing the hand-rolled `<pre>` — no more line cap |
| `@tabler/icons-react` | File-type icons (per-icon ESM subpath imports through `src/client/tabler-icons.ts` — tree-shaken to exactly the icons we use), plus expand/collapse chevrons |
| react / react/jsx-runtime / `@deepseek-ai/dsh-client-ui-primitives` | Platform externals (resolved from the loader module table, never bundled) |

Adding more mature components is trivial: `npm i <lib>` + `import` it —
tsdown inlines non-external deps (e.g. a markdown renderer, a diff viewer, a
code editor for the preview).

## Notes

- The host (`dsh-filetree-v2`, /filetree endpoints) is a separate package —
  its changes require an app restart (or the versioned-package trick).
- `npm install` needs `--legacy-peer-deps` on this machine (react 18.3.1 vs
  react-dom@19 peer), and npm must be invoked through `cmd /c npm ...`.
