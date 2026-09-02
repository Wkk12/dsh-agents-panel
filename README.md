# dsh-agents-panel

DSH(DeepSeek Harness)社区插件:在 DSH Web UI 里以「公共仓库」弹窗浏览/管理 `~/.agents` 公共资产库(技能 / 全局规则 / MCP 定义),像文件夹一样操作。

- 入口:DSH 左侧边栏底部「公共仓库」按钮 → 弹出**居中弹窗**(跟随主题/亮暗)。
- 布局:**左侧文件树 + 右侧多文件 tabs 预览**。
- `.md` 文件(SKILL.md / AGENTS.md)渲染为**格式化 Markdown** 预览,可切换「预览 / 源码」;其它文件为可编辑源码。
- 数据源 `~/.agents` 在主目录,聚合了跨工具的技能、规则、MCP。

## 安装(已发布到 GitHub)

```bash
dsh plugin --profile web add github:Wkk12/dsh-agents-panel
```

> 由于 DSH 加载 UI 插件必须通过 profile 的 bundle 列表(`dsh plugin add` 会自动登记),本插件以正规市场方式安装、每次启动保留。源码在本仓库,可自行 fork/改。

## 数据接口(Host)

| 路由 | 作用 |
| --- | --- |
| `/agents/list?dir=` | 列出 `~/.agents` 下文件/目录 |
| `/agents/read?path=` | 读文本文件 |
| `/agents/write?path=&content=` | 写/新建文本 |
| `/agents/delete?path=` | 删除文件 |

> Host 用 node fs + `os.homedir()` 直接读主目录 `~/.agents`(DSH 的 `ctx.fs` 绑定在沙盒根,读不了主目录)。

## 开发

```bash
node build.mjs        # 产出 lib/index.js + lib/client.js 并交给 DSH
```

- `package.json`:`dsh.bundle.patch` + `dsh.client(platform: web)` 自注册。
- 构建:esbuild;浏览器包以 CJS 闭包工厂 `window.__ModuleLoader__.load(...)` 输出,react/react-dom/cordis/ui 等 seed 标 external。
