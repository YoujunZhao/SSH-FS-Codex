import * as vscode from 'vscode';

import type { RemoteDirectoryEntry, RemoteTreeAdapter } from './core/sync';

export class VsCodeRemoteTreeAdapter implements RemoteTreeAdapter {
  constructor(private readonly rootUri: vscode.Uri) {}

  async listDirectory(remotePath: string): Promise<RemoteDirectoryEntry[]> {
    const entries = await vscode.workspace.fs.readDirectory(this.withPath(remotePath));

    return entries.map(([name, fileType]) => ({
      name,
      kind: fileType === vscode.FileType.Directory ? 'directory' : 'file'
    }));
  }

  async readFile(remotePath: string): Promise<Uint8Array> {
    return vscode.workspace.fs.readFile(this.withPath(remotePath));
  }

  private withPath(remotePath: string): vscode.Uri {
    const normalizedPath = remotePath.startsWith('/') ? remotePath : `/${remotePath}`;
    return this.rootUri.with({ path: normalizedPath });
  }
}
