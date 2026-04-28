# Publishing and release notes

## Before you publish

- Replace placeholder metadata in `package.json` (`publisher`, `repository`, `homepage`, `bugs`).
- Review `README.md`, `CHANGELOG.md`, and `LICENSE`.
- Run the verification checklist:
  - `npm run lint`
  - `npm test`
  - `npm run package:vsix`
- Confirm no secrets or personal paths are committed.

## GitHub release flow

1. Create a repository and push the branch.
2. Tag the first version:
   ```bash
   git tag v0.0.1
   git push origin main --tags
   ```
3. Attach the generated `.vsix` file to the GitHub release.
4. Copy the release summary from the template below.

## VS Code Marketplace flow

1. Create a publisher in the Visual Studio Marketplace portal.
2. Update `package.json` with the real `publisher` value.
3. Authenticate `vsce` using your marketplace credentials.
4. Publish:
   ```bash
   npx @vscode/vsce publish
   ```

## Suggested release notes template

### Codex SSH FS Bridge v0.0.1

- Initial release of a bridge extension for SSH FS-style VS Code workspaces.
- Added local mirror creation for remote folders that use `ssh`, `sshfs`, or `sftp` URI schemes.
- Added commands to open the local mirror workspace, refresh it from remote, and push local changes back.
- Added packaging, lint/test verification, and GitHub Actions CI.

## Suggested GitHub repository sections

- **Purpose**: Explain that the extension mirrors SSH FS workspaces into local folders so Codex CLI can work on them.
- **How it works**: Document the sync-down / edit locally / sync-up workflow.
- **Safety notes**: Mention that sync is explicit, symlinks are skipped, and deletions are only mirrored when the user runs the push command.
