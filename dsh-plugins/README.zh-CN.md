[English](README.md) · [中文](README.zh-CN.md)

# dsh-plugins — 面向 DSH 网页端的可折叠实时文件树侧栏

两个小插件为 DeepSeek Harness 网页端添加**可折叠文件树侧栏** —— 树位于**右侧面板**,由会话列右缘居中的**悬浮 DeepSeek 蓝圆形按钮**(> / <)开关:

| 包 | 作用 |
| --- | --- |
| `dsh-explorer` | **宿主端插件**(Node):通过 dsh web 服务器提供只读 `/filetree/*` JSON 接口 —— 目录列表、文件读取、递归搜索、git 状态。**零依赖。** |
| `dsh-client-ui-explorer` | **浏览器端插件**(TS/TSX):悬浮 >/< 按钮和右侧文件树抽屉 —— 懒加载虚拟化树、VS Code 风格层级线、搜索、CodeMirror 预览、git 装饰。 |

## 接线方式 —— 100% 纯插件(无侵入补丁)

整个功能是**抽屉悬浮层**,完全基于官方插件管线构建 —— **没有修改任何 dsh 自带包**,dsh 升级永远坏不了:

1. **宿主**(`dsh-explorer`,本 profile 部署为 `dsh-explorer-v1`):通过 profile 的 `cordis.patch.yml` 挂载的标准 cordis 插件;提供 `/filetree/list`、`/filetree/root`、`/filetree/read`、`/filetree/search`、`/filetree/gitstatus`。
2. **浏览器端**(`dsh-client-ui-explorer`):通过 `dsh.client` 声明发现的标准客户端插件。向既有 `shell.overlay` 列表槽注册**一个条目**(`id: "filetree.drawer"`),渲染:
   - 悬浮 DeepSeek 蓝圆形开关(> / <)
   - 右侧**抽屉**:悬浮列(不参与布局)自带 pointer-capture 拖拽把手,文件树(VS Code 风格逐行层级线 + 悬浮高亮、虚拟化)、搜索、全部展开/折叠、点击预览(CodeMirror 6),以及 **git 装饰** —— M/A/U/D/R 字母 + 文件名着色、文件夹脏点、删除文件幽灵行、gitignore 变淡、VS Code `files.exclude` 默认值
   - 开关状态与宽度持久化在 `localStorage`(`dsh.filetree.panel`、`dsh.filetree.width`)

`dsh-client-ui-layout` bundle 保持**原样**(已从 npm tarball 逐字节还原 —— dsh 升级后无需重打补丁)。

与真实网格列相比的取舍:抽屉**悬浮**在会话之上(会话不重排);会话保持宽度,抽屉盖住其右侧。

## 官方形态(2026-08 dsh 插件规范)

两个包均遵循官方插件契约:

- **宿主** `dsh-explorer` —— 纯 Cordis entry(`name`/`inject`/`apply` + `main`/`exports["."]`),零运行时依赖;通过 profile 的 `cordis.patch.yml` insert 行安装(配置 HMR,免重启)。
- **浏览器端** `dsh-client-ui-explorer` —— 声明 `dsh.client`(`platform: "web"`,inject 边含 locale/runtime/ui-slots),并在 `exports["./client"]` 导出构建产物(类型在 `lib/types/client/index.d.ts`);带 `prepare` 脚本,git 源安装时自动从 `src/` 构建 `lib/`。
- 旧机制(`dsh.plugin.json`、`dsh registry`、repository-plugins)已于 2026-08 在上游移除,未使用。

## 安装(全新 profile)

**一行命令 bundle 安装(推荐):**

```bash
# 宿主
 dsh plugin --profile web add "github:No-PRM/dsh-explorer#main&path:/dsh-plugins/dsh-explorer"
# 浏览器端
 dsh plugin --profile web add "github:No-PRM/dsh-explorer#main&path:/dsh-plugins/dsh-client-ui-explorer"
# 然后重启 dsh
```

两个包都是官方 **bundle 形态**(`dsh.bundle.patch` + 构建产物 `lib/` 已入库,git 源安装无需构建)。

> **开发机?** `dsh plugin add` 通道面向全新 profile / 其他用户。如果你的 checkout 已经用 **junction + `cordis.patch.yml` insert 行**的开发方式,在同一 profile 里再跑这些命令会冲突(node_modules 同名包 + 重复插件行)—— 每个 profile 二选一。

**手动方式(开发/免重启):**把两个包拷进 `~/.dsh/profiles/<profile>/node_modules/` —— 浏览器包必须含**构建好的** `lib/client.js`。
2. 在 profile 的 `cordis.patch.yml` 中加两个条目:

   ```yaml
   - insert:
       - id: filetree
         name: dsh-explorer-v1     # 宿主 —— 递增后缀即可免重启部署
       - id: ui-filetree
         name: dsh-client-ui-explorer
   ```

3. 重启 dsh(或对宿主用版本名技巧免重启生效)。使用者**不需要 npm install** —— 浏览器 bundle 自包含;平台外部依赖(react、primitives)来自 dsh loader 模块表。

## 线上验证

- 宿主:`GET http://127.0.0.1:3080/filetree/list?path=D:/CodeWorkspaces/测试/create` 与 `GET http://127.0.0.1:3080/filetree/gitstatus?path=...`
- 启动图:`GET /` → `window.__DSH_BOOT__` 包含 `dsh-client-ui-explorer`。

## 版本号

两个数字,两种用途:

- **包 semver**(两个 `package.json` 的 `0.1.0`)—— 真正的插件版本,用于分发;功能/小版本更新时两个包同步递增。
- **本地部署后缀**(`dsh-explorer-v1`)—— 每台机器的免重启部署计数(复制成新后缀让新模块 id 生效)。不是 semver。

GitHub 分发建议把安装 pin 到 release tag 而不是分支:

```bash
 dsh plugin --profile web add "github:No-PRM/dsh-explorer#v0.1.0&path:/dsh-plugins/dsh-explorer"
```

## 开发

- 源码就在本目录;已安装副本位于 `~/.dsh/profiles/web/node_modules/` —— 浏览器安装是**junction**(指向源码,构建即热更新);宿主是拷贝。
- 浏览器:`cd dsh-client-ui-explorer && npm run dev`(watch + 同步)、`npm run bundle`(压缩一次性构建)、`npm run types`(生成 `lib/types/` 声明)、`npm run typecheck`。
- 宿主:编辑 `dsh-explorer/lib/index.js`,然后拷贝到 `node_modules/dsh-explorer-v<N>/lib/index.js` 并递增名字以免重启部署。
