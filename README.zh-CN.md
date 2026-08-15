[English](README.md) · [中文](README.zh-CN.md)

# dsh-filetree —— DeepSeek Harness 文件树侧栏

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 网页端添加**可折叠、实时更新的文件树侧栏** —— 右缘悬浮的 DeepSeek 蓝圆形按钮打开抽屉,展示当前工作区的文件结构,提供 VS Code 级别的资源管理器体验。**100% 纯插件**:不改动任何 dsh 自带包,dsh 升级永远不会弄坏它。

## 功能

- **右侧抽屉**(264–720 px,可拖拽调宽)+ 悬浮 DeepSeek 蓝圆形开关(> / <),0.45 s 无回弹滑入,开关/宽度持久化
- **懒加载虚拟化树**(@tanstack/virtual-core):只渲染可见行,超大目录也流畅
- **VS Code 风格层级线** + 悬浮高亮;按 `files.exclude` 默认隐藏 VCS 内部目录(`.git`/`.svn`/`.hg`/`CVS`、`.DS_Store`/`Thumbs.db`)
- **git 装饰**:M/A/U/D/R 状态字母(固定最右一列)、文件名着色、文件夹脏点、删除文件显示为删除线幽灵行、gitignore 文件/目录变淡
- **媒体预览**:图片/视频/音频/PDF 原生流式加载(Range 断点,视频可拖进度);文本用 CodeMirror 6 预览(Ctrl+F 是 VS Code 风格悬浮查找条)
- **拖拽引用**:把任意文件/文件夹行拖进聊天输入框,插入 Codex 风格 `@相对路径` 引用
- 搜索(跳过 `.git`/node_modules)、全部展开/折叠、1.2 s 实时刷新
- 中英双语文档

## 架构 —— 两个纯插件

| 包 | 作用 |
| --- | --- |
| `dsh-filetree` | **宿主端插件**(Node):通过 dsh web 服务器提供只读 `/filetree/*` JSON 接口 —— 目录列表、文件读取、递归搜索、git 状态、媒体流式输出。零运行时依赖。 |
| `dsh-client-ui-filetree` | **浏览器端插件**(TS/TSX):悬浮按钮 + 右侧抽屉 —— 虚拟化树、层级线、git 装饰、CodeMirror 预览、拖拽引用。 |

两个包都遵循官方 dsh 插件契约(`dsh.client` + `exports["./client"]`、Cordis entry、零 `@deepseek-ai/*` 依赖声明)。接线与官方形态说明见 [dsh-plugins/README.zh-CN.md](dsh-plugins/README.zh-CN.md)。

## 安装

两个部分缺一不可。把两个包拷进 profile 的 `node_modules`,然后在它的 `cordis.patch.yml` 加两个条目:

```yaml
- insert:
    - id: filetree
      name: dsh-filetree-v5     # 宿主 —— 递增后缀可免重启部署
    - id: ui-filetree
      name: dsh-client-ui-filetree
```

重启 dsh(或对宿主用版本名技巧)。浏览器 bundle 自包含 —— 使用者**不需要 npm install**。详细步骤:[dsh-plugins/README.zh-CN.md](dsh-plugins/README.zh-CN.md)。

## 开发

```bash
cd dsh-plugins/dsh-client-ui-filetree
npm run dev        # tsdown --watch + 实时同步到运行中的 profile
npm run bundle     # 一次性压缩构建(oxc)
npm run types      # 生成 lib/types/*.d.ts 声明
npm run typecheck  # tsc --noEmit
```

宿主改动写入 `dsh-plugins/dsh-filetree/lib/index.js`;以递增包名(如 `dsh-filetree-v6`)部署到 profile 可免重启生效。

## 文档

- [dsh-plugins/README.zh-CN.md](dsh-plugins/README.zh-CN.md) —— 架构、安装、部署、开发([English](dsh-plugins/README.md))
- [dsh-client-ui-filetree/README.zh-CN.md](dsh-plugins/dsh-client-ui-filetree/README.zh-CN.md) —— 浏览器插件([English](dsh-plugins/dsh-client-ui-filetree/README.md))
- [dsh-filetree/README.zh-CN.md](dsh-plugins/dsh-filetree/README.zh-CN.md) —— 宿主接口([English](dsh-plugins/dsh-filetree/README.md))

## 许可证

MIT
