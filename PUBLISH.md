# 发布 dsh-agents-panel 到 GitHub 并装进 DSH 市场

> 插件源码/产物已在 `~/agents-hub/dsh-agents-panel/`,`package.json` 的 `repository.url` 已填成你(`Wkk12`)的地址。

## 步骤 1:在 GitHub 建仓库

1. 打开 https://github.com/Wkk12 → **New repository**
2. 仓库名: `dsh-agents-panel`
3. **Public**(DSH 市场索引的是公开仓库;若只想自用,可 Private,但市场面板可能加不了)
4. **不要**勾选 “Add a README” / “Add .gitignore”(本仓库已有内容,避免冲突)
5. 点 **Create repository**

## 步骤 2:推代码(在终端)

```bash
cd ~/agents-hub/dsh-agents-panel

# 用 SSH(推荐,需你机器已配过 SSH key):
git remote add origin git@github.com:Wkk12/dsh-agents-panel.git

# 或 HTTPS(每次要输密码/用 token):
# git remote add origin https://github.com/Wkk12/dsh-agents-panel.git

git push -u origin main
```

> 若 `main` 不在,看 `git branch` 实际分支名(本地可能是 `master`)。

## 步骤 3:在 DSH 市场安装

在 **DSH Desktop 的插件市场面板**里:

- 添加来源:`github:Wkk12/dsh-agents-panel`
- 或命令行(若你的 DSH 有 `dsh` CLI):`dsh plugin --profile web add github:Wkk12/dsh-agents-panel`

> 若市场面板不支持从 GitHub 加一个公开仓库,可改成发布到 npm:
> ```bash
> cd ~/agents-hub/dsh-agents-panel && npm login && npm publish
> dsh plugin --profile web add dsh-agents-panel
> ```

## 步骤 4:重启并验证

重启 DSH Desktop → **左侧边栏底部**出现「公共仓库」按钮 → 点开右侧文件树面板,看 `~/.agents`(skills / AGENTS.md / mcp/)。

## 若面板不显示

说明客户端 bundle 或市场发现需要微调(我无法直接看到 DSH 界面确认渲染)。你回来后告诉我「是否出现」,我在 `~/agents-hub/dsh-agents-panel` 里调整并重新 push。

## 已知说明

- Host 半部提供 `/agents/list|read|write|delete` 四个接口(列目录/读/写/删)。
- 插件通过 `dsh.bundle.patch` + `dsh.client(platform:web)` 自注册,装进市场后由 dshmarket 管理、每次启动保留。
