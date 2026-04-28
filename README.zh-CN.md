# SSH FS Codex

<p align="center">
  <a href="./README.zh-CN.md"><img alt="中文 README" src="https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-blue?style=for-the-badge"></a>
  <a href="./README.md"><img alt="English README" src="https://img.shields.io/badge/README-English-green?style=for-the-badge"></a>
</p>

SSH FS Codex 是一个 VS Code 插件，用来让 Codex CLI 可以在 VS Code 的 SSH FS workspace 里使用。它会把 SSH FS 远程目录同步到一个真实的本地 mirror 文件夹，让 Codex 在本地路径里工作；你确认修改后，再手动同步回 SSH FS 远程目录。

Codex 能在 VS Code Remote SSH 里工作，是因为 VS Code 会在远程机器上运行 extension host。SSH FS 类插件通常只是在本地 VS Code 里暴露 `ssh://...`、`sshfs://...`、`sftp://...` 这类虚拟 URI；很多依赖普通本地路径的工具不能直接处理这些 URI。SSH FS Codex 就是用本地 mirror 来补上这个缺口。

## 安装

如果你已经有 `.vsix` 文件：

1. 打开 VS Code。
2. 打开 Extensions 侧边栏。
3. 点击右上角 `...`。
4. 选择 `Install from VSIX...`。
5. 选择 `codex-sshfs-bridge.vsix`。
6. 安装后 reload VS Code。

也可以用命令行安装：

```bash
code --install-extension .tmp-vsix/codex-sshfs-bridge.vsix --force
```

如果你是从 GitHub 源码安装：

```bash
git clone https://github.com/YoujunZhao/SSH-FS-Codex.git
cd SSH-FS-Codex
npm install
npm run package:vsix
code --install-extension .tmp-vsix/codex-sshfs-bridge.vsix --force
```

发布到 VS Code Marketplace 之后，可以直接在 VS Code Extensions 里搜索 `Codex SSH FS Bridge` 安装。

## 在 VS Code SSH FS 里使用

1. 先安装并配置 SSH FS 扩展，例如 `Kelvin.vscode-sshfs`。
2. 用 SSH FS 打开远程目录，确保 VS Code Explorer 里看到的是远程 workspace folder。
3. 按 `Cmd+Shift+P` 打开 Command Palette。
4. 运行 `Codex SSH FS Bridge: Sync Workspace to Local Mirror`。
5. 插件会把远程目录同步到本地 mirror，并打开生成的本地 `.code-workspace`。
6. 在这个本地 mirror 窗口里打开 VS Code terminal。
7. 运行 Codex：

```bash
codex
```

8. 让 Codex 修改本地 mirror 里的文件。
9. 检查修改无误后，在 mirror 窗口里按 `Cmd+Shift+P`。
10. 运行 `Codex SSH FS Bridge: Sync Local Mirror Back to Remote`，把本地改动同步回 SSH FS 远程目录。

## 常用命令

- `Codex SSH FS Bridge: Sync Workspace to Local Mirror`  
  从 SSH FS 远程目录拉取到本地 mirror。你在远程 workspace 窗口或 mirror 窗口都可以用它刷新 mirror。

- `Codex SSH FS Bridge: Open Local Mirror Workspace`  
  打开已生成的本地 mirror workspace。

- `Codex SSH FS Bridge: Sync Local Mirror Back to Remote`  
  把本地 mirror 里的新增、修改、删除同步回远程。

- `Codex SSH FS Bridge: Show Mirror Status`  
  显示当前窗口是远程 SSH FS workspace、mirror workspace，还是未检测到可用 workspace。

## 设置项

```json
{
  "codexSshfsBridge.mirrorsRoot": "",
  "codexSshfsBridge.allowedSchemes": ["ssh", "sshfs", "sftp"],
  "codexSshfsBridge.autoPromptOnRemoteWorkspace": true,
  "codexSshfsBridge.openMirrorAfterSync": true,
  "codexSshfsBridge.maxFileSizeMb": 16
}
```

- `mirrorsRoot`: 本地 mirror 存放目录。留空时使用 `~/.codex-sshfs-bridge/mirrors`。
- `allowedSchemes`: 识别哪些 VS Code URI scheme 为 SSH FS workspace。
- `autoPromptOnRemoteWorkspace`: 打开远程 workspace 时是否自动提示创建 mirror。
- `openMirrorAfterSync`: 同步完成后是否自动打开本地 mirror workspace。
- `maxFileSizeMb`: 超过该大小的文件不会同步。

## 注意事项

- 同步不是实时的。开始 Codex 前先 pull 到 mirror，确认修改后再 push 回远程。
- 从 mirror push 回远程时，本地删除的文件也会从远程删除。
- 超过 `maxFileSizeMb` 的文件会跳过，避免误处理大文件。
- 符号链接会跳过。
- 如果插件提示没有检测到 SSH FS workspace，检查远程 URI scheme 是否在 `allowedSchemes` 里。
- 如果 Codex 还是看到 `ssh://...` 路径，说明你还在 SSH FS 远程窗口里；请切到插件打开的本地 mirror workspace。

## 功能

- 按 VS Code URI scheme 检测 SSH FS 类 workspace。
- 默认把远程目录同步到 `~/.codex-sshfs-bridge/mirrors` 下的稳定本地 mirror。
- 打开生成的 `.code-workspace`，让 Codex 在真实本地路径里工作。
- 按需把 mirror 修改同步回远程 workspace。
- 显式 push 时会把本地 mirror 中删除的文件同步删除到远程。
- 跳过超过配置大小限制的文件。
- 在 VS Code status bar 显示远程/mirror 状态。

## 开发

```bash
npm install
npm run check
npm run package:vsix
```

## 发布

不要把 personal access token 存进仓库。使用环境变量，或者使用 `vsce login` 的交互式登录流程。

```bash
npm run check
npm run package:vsix
npx @vscode/vsce login youjunzhao
npx @vscode/vsce publish
```

发布前确认 `package.json` 里的 `publisher`、`repository`、`bugs` 和 `homepage` 字段都指向你控制的 GitHub 仓库和 VS Code Marketplace publisher。
