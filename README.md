# SSH FS Codex

SSH FS Codex is a VS Code extension that makes SSH FS-backed workspaces usable with Codex CLI. It mirrors a VS Code SSH FS workspace into a real local folder, lets Codex work there, then syncs the local changes back to the SSH FS remote when you ask it to.

Remote SSH works for Codex because VS Code runs an extension host on the remote machine. SSH FS-style extensions usually expose files through virtual URIs such as `ssh://...`, `sshfs://...`, or `sftp://...`; many filesystem-heavy tools expect a normal local path and cannot work directly on those URIs. SSH FS Codex bridges that gap.

## 中文快速开始

### 安装

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

### 在 VS Code SSH FS 里使用

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

### 常用命令

- `Codex SSH FS Bridge: Sync Workspace to Local Mirror`  
  从 SSH FS 远程目录拉取到本地 mirror。你在远程 workspace 窗口或 mirror 窗口都可以用它刷新 mirror。

- `Codex SSH FS Bridge: Open Local Mirror Workspace`  
  打开已生成的本地 mirror workspace。

- `Codex SSH FS Bridge: Sync Local Mirror Back to Remote`  
  把本地 mirror 里的新增、修改、删除同步回远程。

- `Codex SSH FS Bridge: Show Mirror Status`  
  显示当前窗口是远程 SSH FS workspace、mirror workspace，还是未检测到可用 workspace。

### 设置项

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

### 注意事项

- 同步不是实时的。开始 Codex 前先 pull 到 mirror，确认修改后再 push 回远程。
- 从 mirror push 回远程时，本地删除的文件也会从远程删除。
- 超过 `maxFileSizeMb` 的文件会跳过，避免误处理大文件。
- 符号链接会跳过。
- 如果插件提示没有检测到 SSH FS workspace，检查远程 URI scheme 是否在 `allowedSchemes` 里。
- 如果 Codex 还是看到 `ssh://...` 路径，说明你还在 SSH FS 远程窗口里；请切到插件打开的本地 mirror workspace。

## Features

- Detects SSH FS-style workspace folders by URI scheme.
- Pulls remote folders into a deterministic local mirror under `~/.codex-sshfs-bridge/mirrors` by default.
- Opens a generated `.code-workspace` file for Codex work.
- Pushes mirror edits back to the remote workspace on demand.
- Propagates local mirror deletes back to the remote during explicit push.
- Skips files larger than the configured size limit.
- Shows remote/mirror status in the VS Code status bar.

## Development

```bash
npm install
npm run check
npm run package:vsix
```

## Publishing

Do not store personal access tokens in this repository. Use environment variables or the interactive `vsce login` flow.

```bash
npm run check
npm run package:vsix
npx @vscode/vsce login youjunzhao
npx @vscode/vsce publish
```

Before publishing, confirm that the `publisher`, `repository`, `bugs`, and `homepage` fields in `package.json` match the GitHub repository and VS Code Marketplace publisher you control.
