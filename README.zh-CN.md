[English](README.md) · [中文](README.zh-CN.md)

# create — dsh 文件树插件工作区

两个插件的源码仓库,为 DeepSeek Harness 网页端添加**可折叠、实时更新的文件树侧栏**:

| 目录 | 作用 |
| --- | --- |
| `dsh-plugins/dsh-client-ui-filetree` | **浏览器端插件**:右侧文件树抽屉 + 悬浮 DeepSeek 蓝圆形按钮(TS/TSX、tsdown 构建、oxc 压缩、生成类型声明) |
| `dsh-plugins/dsh-filetree` | **宿主端插件**:/filetree/list · /filetree/root · /filetree/read · /filetree/search · /filetree/gitstatus |

功能:懒加载虚拟化文件树、VS Code 风格层级线、git 状态装饰(M/A/U/D/R 标记、文件名着色、忽略变灰、删除幽灵行)、CodeMirror 预览、搜索、`files.exclude` 默认隐藏。

安装/部署/开发详见 `dsh-plugins/README.zh-CN.md`。
