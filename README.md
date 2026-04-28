# Codex SSH FS Bridge

Codex SSH FS Bridge makes SSH FS-backed VS Code workspaces usable with Codex CLI by creating a local mirror workspace. Codex works in the mirror on a normal filesystem path, while this extension reads and writes the remote workspace through VS Code's file-system APIs.

Remote SSH works for Codex because VS Code runs an extension host on the remote machine. SSH FS-style extensions usually expose files through virtual URIs such as `ssh://...`, `sshfs://...`, or `sftp://...`; many filesystem-heavy tools expect a real local path and cannot operate directly on those URIs. This extension bridges that gap.

## Features

- Detects SSH FS-style workspace folders by URI scheme.
- Pulls remote folders into a deterministic local mirror under `~/.codex-sshfs-bridge/mirrors` by default.
- Opens a generated `.code-workspace` file for Codex work.
- Pushes mirror edits back to the remote workspace on demand.
- Skips files larger than the configured size limit.
- Shows remote/mirror status in the VS Code status bar.

## Commands

- `Codex SSH FS Bridge: Sync Workspace to Local Mirror`
- `Codex SSH FS Bridge: Open Local Mirror Workspace`
- `Codex SSH FS Bridge: Sync Local Mirror Back to Remote`
- `Codex SSH FS Bridge: Show Mirror Status`

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

When `mirrorsRoot` is empty, mirrors are stored in `~/.codex-sshfs-bridge/mirrors`.

## Usage

1. Open a workspace folder through your SSH FS extension.
2. Run `Codex SSH FS Bridge: Sync Workspace to Local Mirror`.
3. Open the generated mirror workspace when prompted.
4. Run Codex from the local mirror terminal:

```bash
codex
```

5. After Codex edits files, run `Codex SSH FS Bridge: Sync Local Mirror Back to Remote` from the mirror workspace.

## Limitations

- Sync is explicit, not live. Pull before starting Codex and push after reviewing Codex edits.
- Deletes are not propagated yet; the push command creates or updates files.
- Symbolic links are skipped.
- Large files over `codexSshfsBridge.maxFileSizeMb` are skipped.
- The exact URI scheme depends on the SSH FS extension; add it to `allowedSchemes` if needed.

## Development

```bash
npm install --cache .npm-cache
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
