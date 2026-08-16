[English](README.md) · [中文](README.zh-CN.md)

# dsh-client-ui-explorer

面向 dsh 网页端的**可折叠实时文件树抽屉** —— 100% 纯插件(不改动 dsh 自带包,可随升级存活)。

![dsh-explorer 文件树](../../assets/screenshot.png)

## 功能

- 右缘居中的悬浮 **DeepSeek 蓝圆形按钮**(\> / \<)
- 右侧**抽屉**(悬浮列,自带拖拽把手,264–720 px),开合滑入动画(0.45 s,无回弹),按钮跟随抽屉边缘
- 当前文件夹 = 当前会话工作区(`cwd`),默认展开根目录
- 可折叠树 + **VS Code 风格逐行层级线**与悬浮高亮(活动节点的父线),懒加载、持久化展开状态
- **虚拟化渲染**(@tanstack/virtual-core):只挂载可见行,超大目录也流畅
- **git 装饰**(VS Code 风格):M/A/U/D/R 状态字母 + 文件名着色、文件夹脏点、已删除文件显示为删除线幽灵行、gitignore 文件/目录变淡 —— 数据来自宿主 `/filetree/gitstatus`,约 3 秒轮询
- VS Code `files.exclude` 默认值:`.git`/`.svn`/`.hg`/`CVS` 和 `.DS_Store`/`Thumbs.db` 隐藏;`node_modules` 仍显示
- 搜索框(宿主 `/filetree/search`,失败时回退到客户端 BFS),跳过 `.git`/node_modules,点击结果可预览
- **git 对照**:有改动的文件在预览头部有 *diff* 按钮 —— HEAD 与工作区**并排对照**(@codemirror/merge,未变区域折叠、变更行标注)
- 点击文件 → **预览**:文本走 **CodeMirror 6**(行号、选择/复制、主题、虚拟化、Ctrl+F 的 VS Code 风格悬浮查找条);**媒体原生渲染** —— 图片/视频/音频/PDF 通过宿主 `/filetree/raw` 流式加载(Range 断点支持,视频可拖动进度)
- 文本 512 KB 上限 + 二进制检测,1.2 s 实时刷新
- 全部展开 / 全部折叠(有界:150 目录 × 深度 6)、手动刷新
- **拖拽引用**:把任意文件/文件夹行拖到聊天输入框 —— 插入**纯相对路径**,输入框上方显示**可删除的引用标签**(图标 + 路径 + ×),与草稿同步
- **内容拖拽**:预览里选中代码拖到输入框,插入 XML 标签引用 `<reference path="相对路径" lines="起始行-结束行" />`(对模型语义明确),同一套 chip 流程

## 工程化配置(官方工具链)

| 文件 / 目录 | 用途 |
| --- | --- |
| `src/client/*.ts(x)` | TypeScript/TSX 源码,按职责拆分(入口、抽屉、面板、树、虚拟化、预览、图标、样式、请求、语言、常量) |
| `src/types/` | 共享结构化类型(单个 `index.ts`,被客户端源码引用) |
| `tsdown.config.ts` | tsdown(rolldown)构建:产出 `lib/client.js`,格式严格匹配 `window.__ModuleLoader__.load({ id, factory })`;react / jsx-runtime / primitives 保持外部(由 loader 模块表解析),其余全部内联。**oxc 压缩**(去注释、变量名混淆)+ `process.env.NODE_ENV` 烘焙为 production |
| `tsconfig.json` | strict,`jsx: react-jsx`,`allowImportingTsExtensions` |
| `tsconfig.types.json` | `npm run types` 用的纯声明输出配置 |
| `scripts/types.mjs` | 生成 `lib/types/*.d.ts` + 规范化相对导入扩展名 |
| `scripts/dev.mjs` | `npm run dev`:tsdown --watch + junction 感知的同步到线上 profile 安装 |
| `lib/client.js` | **构建产物**(勿手改) |
| `lib/index.js` | Node 半部(空 apply;让包成为 loader 条目) |
| `lib/types/*.d.ts` | **生成**的类型声明(`npm run types`) |

`~/.dsh/profiles/web/node_modules/dsh-client-ui-explorer` 是指向本目录的 **junction**,所以构建即上线:client-HMR 链每 500ms 轮询所服务文件,约 1 秒内热刷新。

## 开发工作流

```bash
npm install        # 一次(--legacy-peer-deps)
npm run dev        # tsdown --watch + 实时同步 → 改 src、保存、GUI 立即可见
npm run bundle     # 一次性压缩构建
npm run types      # 生成 lib/types/*.d.ts 声明
npm run typecheck  # tsc --noEmit
```

## 用到的库(tsdown 内联)

| 库 | 用途 |
| --- | --- |
| `@tanstack/virtual-core` | 虚拟化树列表(通过 `src/client/virtual.ts` 本地最小适配器 —— 官方 `@tanstack/react-virtual` 会引入 react-dom,约 1 MB) |
| `@uiw/react-codemirror`(+ CodeMirror 6 核心/语言) | **预览**:只读编辑器(行号、主题、虚拟化、VS Code 风格查找条) |
| `@tabler/icons-react` | 文件类型图标(按图标的 ESM 子路径导入 —— 树摇到只用到的图标) |
| react / react/jsx-runtime / `@deepseek-ai/dsh-client-ui-primitives` | 平台外部依赖(loader 模块表,永不打包) |

## 安装(全新 profile)

必须安装两个包(见仓库级 `dsh-plugins/README.md`):

1. 把本包(需带**构建好的** `lib/client.js`)和宿主 `dsh-explorer` 一起拷进 profile 的 `node_modules`。
2. 在 profile 的 `cordis.patch.yml` 中加两个 `insert` 条目。
3. 重启 dsh(或递增宿主包名免重启部署)。

使用者**不需要 npm install** —— bundle 自包含,平台外部依赖来自 dsh loader。
