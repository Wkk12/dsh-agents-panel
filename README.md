# dsh-agents-panel

本机**自有**的 DSH 本地插件:在 DSH Web UI 显示 `~/.agents` 公共资产库(技能/规则/MCP),像文件夹一样浏览。

## 独立性设计(实测修正)

- 源码/产物在 `~/agents-hub/dsh-agents-panel/`,自有目录,可进 git,不是市场下载插件。
- **DSH 加载 UI 插件必须走 profile 的 bundle 列表**(`resolveBundleDir` 只解析 `dsh.profile.bundles` 里的包;纯 `cordis.patch.yml` 用户层插入不加载新包——已实测)。
- 因此:把它加进 `dsh.profile.bundles`(**与框架 bundle `dsh-base`/`dsh-web-app` 并列**,是自有本地包;市场对其它包的装/卸/更不影响它),并软链进依赖目录。
- 数据源 `~/.agents` 在主目录,本就独立。

## 结构

```
dsh-agents-panel/
├── package.json        # dsh.bundle.patch + dsh.client(platform: web)
├── cordis.patch.yml    # - insert(插件自注册)
├── src/index.ts        # Host: ctx.fs + ctx.webServer.register('/agents')
├── src/client/index.ts # Browser: 注册 sidebar.footer.action + shell.overlay
├── build.mjs           # esbuild 构建 lib/
└── lib/                # 构建产物 index.js + client.js
```

## 数据接口(Host)

| 路由 | 作用 |
| --- | --- |
| `/agents/list?dir=` | 列出 `~/.agents` 下文件/目录 |
| `/agents/read?path=` | 读文件内容 |
| `/agents/write` | 写文件 |
| `/agents/delete?path=` | 删文件 |

## 安装路径(实测有效)

1. 构建:`node build.mjs`(产出 `lib/index.js` + `lib/client.js`)。
2. 软链:`ln -sfn ~/agents-hub/dsh-agents-panel ~/.dsh/profiles/node_modules/dsh-agents-panel`。
3. 在 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 追加 `"dsh-agents-panel"`。
4. **重启 Desktop**。
5. 验证:浏览器 DevTools→Network 看 `/plugins/dsh-agents-panel/client.js` 是否 200;左侧边栏底部应出现「公共仓库」。

> 插件自身的 `cordis.patch.yml`(`dsh.bundle.patch`)负责自注册,无需写进 profile 的用户层 patch。
