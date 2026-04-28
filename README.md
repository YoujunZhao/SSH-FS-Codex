# SSH FS Codex

<p align="center">
  <a href="./README.zh-CN.md"><img alt="中文 README" src="https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-blue?style=for-the-badge"></a>
  <a href="./README.md"><img alt="English README" src="https://img.shields.io/badge/README-English-green?style=for-the-badge"></a>
</p>

SSH FS Codex is a VS Code extension that makes SSH FS-backed workspaces usable with Codex CLI. It mirrors a VS Code SSH FS workspace into a real local folder, lets Codex work there, then syncs the local changes back to the SSH FS remote when you ask it to.

Remote SSH works for Codex because VS Code runs an extension host on the remote machine. SSH FS-style extensions usually expose files through virtual URIs such as `ssh://...`, `sshfs://...`, or `sftp://...`; many filesystem-heavy tools expect a normal local path and cannot work directly on those URIs. SSH FS Codex bridges that gap.

## Installation

If you already have the `.vsix` package:

1. Open VS Code.
2. Open the Extensions view.
3. Click the `...` menu in the top-right corner.
4. Select `Install from VSIX...`.
5. Choose `codex-sshfs-bridge.vsix`.
6. Reload VS Code after installation.

You can also install from the command line:

```bash
code --install-extension .tmp-vsix/codex-sshfs-bridge.vsix --force
```

To build and install from GitHub source:

```bash
git clone https://github.com/YoujunZhao/SSH-FS-Codex.git
cd SSH-FS-Codex
npm install
npm run package:vsix
code --install-extension .tmp-vsix/codex-sshfs-bridge.vsix --force
```

After the extension is published to the VS Code Marketplace, install it by searching for `Codex SSH FS Bridge` in the VS Code Extensions view.

## Usage In VS Code SSH FS

1. Install and configure an SSH FS extension, such as `Kelvin.vscode-sshfs`.
2. Open the remote directory through SSH FS and confirm that VS Code Explorer shows the remote workspace folder.
3. Press `Cmd+Shift+P` to open the Command Palette.
4. Run `Codex SSH FS Bridge: Sync Workspace to Local Mirror`.
5. The extension syncs the remote folder into a local mirror and opens the generated `.code-workspace`.
6. In the local mirror window, open a VS Code terminal.
7. Run Codex:

```bash
codex
```

8. Let Codex edit files in the local mirror.
9. Review the changes.
10. In the mirror window, press `Cmd+Shift+P`.
11. Run `Codex SSH FS Bridge: Sync Local Mirror Back to Remote` to sync local changes back to the SSH FS remote folder.

## Commands

- `Codex SSH FS Bridge: Sync Workspace to Local Mirror`  
  Pulls the SSH FS remote folder into a local mirror. You can run it from the remote workspace window or the mirror window to refresh the mirror.

- `Codex SSH FS Bridge: Open Local Mirror Workspace`  
  Opens the generated local mirror workspace.

- `Codex SSH FS Bridge: Sync Local Mirror Back to Remote`  
  Pushes new, changed, and deleted files from the local mirror back to the remote folder.

- `Codex SSH FS Bridge: Show Mirror Status`  
  Shows whether the current window is an SSH FS remote workspace, a local mirror workspace, or an unsupported workspace.

## Settings

```json
{
  "codexSshfsBridge.mirrorsRoot": "",
  "codexSshfsBridge.allowedSchemes": ["ssh", "sshfs", "sftp"],
  "codexSshfsBridge.autoPromptOnRemoteWorkspace": true,
  "codexSshfsBridge.openMirrorAfterSync": true,
  "codexSshfsBridge.maxFileSizeMb": 16
}
```

- `mirrorsRoot`: Local directory for mirrors. When empty, mirrors are stored in `~/.codex-sshfs-bridge/mirrors`.
- `allowedSchemes`: VS Code URI schemes treated as SSH FS workspaces.
- `autoPromptOnRemoteWorkspace`: Whether to prompt automatically when an SSH FS workspace opens.
- `openMirrorAfterSync`: Whether to open the local mirror workspace after sync.
- `maxFileSizeMb`: Files larger than this size are skipped.

## Notes

- Sync is explicit, not live. Pull before starting Codex and push after reviewing Codex edits.
- When pushing from the mirror, files deleted locally are also deleted from the remote folder.
- Files larger than `maxFileSizeMb` are skipped.
- Symbolic links are skipped.
- If the extension does not detect your SSH FS workspace, check whether the remote URI scheme is listed in `allowedSchemes`.
- If Codex still sees paths like `ssh://...`, you are still in the SSH FS remote window. Switch to the local mirror workspace opened by this extension.

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
