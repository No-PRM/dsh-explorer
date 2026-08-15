[English](README.md) · [中文](README.zh-CN.md)

# dsh-filetree

给 DeepSeek Harness 网页端加一个文件树侧栏。右侧边缘一个蓝色圆形按钮,点开就是当前工作区的文件抽屉 —— 懒加载加虚拟化,目录再大也不卡。

插件只加 UI 和几条只读路由,不碰 dsh 自带的包,升级一般不会出问题。

## 功能

- 右侧抽屉(拖边缘调宽)+ 悬浮蓝色开关,开合状态和宽度都会记住
- VS Code 那种逐行层级线,悬浮时高亮当前行的线
- git 状态一眼看:最右一列 M/A/U/D/R 字母、文件名着色、文件夹脏点、删除的文件画删除线、gitignore 的变淡
- 点文件直接预览:文本走 CodeMirror(Ctrl+F 是 VS Code 样式的查找条),图片/视频/音频/PDF 内嵌播放
- 把文件或文件夹拖进聊天输入框,插入纯相对路径,输入框上方显示可删除的引用标签
- 搜索(跳过 .git 和 node_modules)、全部展开/折叠、每 1.2 秒自动刷新

## 两个包

| 包 | 干什么 |
| --- | --- |
| `dsh-filetree` | 宿主端(Node)。提供只读 `/filetree/*` 接口:列目录、读文件、搜索、git 状态、媒体流。零依赖。 |
| `dsh-client-ui-filetree` | 浏览器端(TS/TSX)。按钮、抽屉、你能看到的一切。 |

两个都按官方插件契约写。接线和部署细节见 [dsh-plugins/README.zh-CN.md](dsh-plugins/README.zh-CN.md)。

## 安装

两个都要。把两个包拷进 profile 的 `node_modules`,再在它的 `cordis.patch.yml` 加:

```yaml
- insert:
    - id: filetree
      name: dsh-filetree-v5
    - id: ui-filetree
      name: dsh-client-ui-filetree
```

重启 dsh;不想重启就把宿主包名递增(v6、v7…)。浏览器 bundle 是自包含的,跑起来不需要 npm install。完整步骤看 [dsh-plugins/README.zh-CN.md](dsh-plugins/README.zh-CN.md)。

## 开发

```bash
cd dsh-plugins/dsh-client-ui-filetree
npm run dev        # watch + 同步到运行中的 profile
npm run bundle     # 一次性压缩构建
npm run types      # 生成 lib/types/*.d.ts
npm run typecheck
```

宿主改动写在 `dsh-plugins/dsh-filetree/lib/index.js`,拷进 profile 时包名递增即可免重启。

## 文档

- [dsh-plugins](dsh-plugins/README.zh-CN.md) — 架构、安装、部署([English](dsh-plugins/README.md))
- [dsh-client-ui-filetree](dsh-plugins/dsh-client-ui-filetree/README.zh-CN.md)([English](dsh-plugins/dsh-client-ui-filetree/README.md))
- [dsh-filetree](dsh-plugins/dsh-filetree/README.zh-CN.md)([English](dsh-plugins/dsh-filetree/README.md))

MIT
