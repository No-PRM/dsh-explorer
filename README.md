[English](README.md) · [中文](README.zh-CN.md)

# create — dsh file-tree plugin workspace

Source repo for two plugins that add a collapsible, real-time **file-tree
sidebar** to the DeepSeek Harness web GUI:

| Directory | Role |
| --- | --- |
| `dsh-plugins/dsh-client-ui-filetree` | **Browser plugin**: right-side file-tree drawer + floating DeepSeek-blue round toggle (TS/TSX, tsdown build, oxc minified, generated type declarations) |
| `dsh-plugins/dsh-filetree` | **Host plugin**: `/filetree/list` · `/filetree/root` · `/filetree/read` · `/filetree/search` · `/filetree/gitstatus` |

Features: lazy virtualized file tree, VS Code-style indent guides, git
decorations (M/A/U/D/R letters, filename tinting, ignored dimming, deleted
ghost rows), CodeMirror preview, search, `files.exclude` defaults.

See `dsh-plugins/README.md` for install / deploy / development details.
