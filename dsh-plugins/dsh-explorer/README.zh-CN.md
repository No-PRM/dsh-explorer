[English](README.md) · [中文](README.zh-CN.md)

# dsh-explorer

文件树侧栏的**宿主端**插件(基于 dsh web 服务器的只读 JSON 接口)—— 浏览器端唯一能读写本地文件系统与 git 的桥梁。

## 接口

| 接口 | 用途 |
| --- | --- |
| `GET /filetree/list?path=<绝对路径>` | 列出单层目录:`{ ok, path, entries: [{ name, kind, size, mtime, hidden }], truncated }`。目录优先、大小写不敏感排序;点文件标记 `hidden`;有界并发 stat 池(48 worker)。 |
| `GET /filetree/root` | 宿主进程的 `cwd`(`{ ok, cwd }`)。 |
| `GET /filetree/read?path=<绝对路径>` | 读取文件用于预览:512 KB 上限(`truncated`)、NUL 字节二进制检测、UTF-8 内容。 |
| `GET /filetree/search?path=<绝对路径>&q=<关键词>` | 递归按文件名搜索(有界:4000 次扫描 / 200 结果 / 深度 14;跳过 `.git` 和 node_modules)。 |
| `GET /filetree/raw?path=<绝对路径>` | 为媒体预览流式输出文件(`image/*`、`video/*`、`audio/*`、PDF):正确 content-type、`Accept-Ranges` + `Range` 断点支持(206 分段响应,视频可拖动进度)。无大小上限。 |
| `GET /filetree/gitdiff?path=<绝对路径>` | 供预览对照用的 HEAD 与工作区内容:`{ ok, git, base, current, same, binary }`(512 KB 上限,二进制 → 空)。 |
| `GET /filetree/gitstatus?path=<绝对路径>` | 供 git 装饰用的状态:`{ ok, git, root, entries: [{ path, status, x, y }], truncated? }`。状态字母 A/M/D/R/C/U/T(`I` = 忽略);通过 `rev-parse --show-toplevel` 向上找仓库根;忽略项来自折叠的 `--ignored` 扫描(即使忽略树巨大也很快);2 秒 TTL 缓存。非仓库/无 git → `{ git: false }`。 |

- 只接受绝对路径(相对路径返回 `400 invalid-path`)。
- 损坏的符号链接 / 不可读子条目会降级为一行,而不是让整个列表失败。
- 每次只列一层 —— 浏览器按需懒加载。
- 纯 GUI 只读面:不会进入模型上下文。
- **零运行时依赖**(仅 node:fs、node:path、node:child_process)。

## 安装

通过 web profile 的 `cordis.patch.yml` 挂载为一行 cordis 配置:

```yaml
- insert:
    - id: filetree
      name: dsh-explorer
```

包位于 `~/.dsh/profiles/web/node_modules/dsh-explorer`(profile 的解析根目录)。

> **免重启部署提示:** 宿主代码改动不会热重载。要让改动无需重启即生效,把包名递增(例如复制为 `dsh-explorer-v1` 并更新上面的 `name:`),新的模块 id 会在下次补丁重放时加载;直接重启也可以。
