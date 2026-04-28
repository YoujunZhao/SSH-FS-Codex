import os from 'node:os';
import path from 'node:path';

import * as vscode from 'vscode';

import { syncLocalToRemote, syncRemoteToLocal } from './core/bridge';
import { detectWorkspaceMode, isSupportedRemoteScheme } from './core/detection';
import { loadMirrorMetadata, refreshMirrorMetadata, writeWorkspaceFile } from './core/metadata';
import { createMirrorLayout } from './core/pathing';
import type { BridgeConfiguration, MirrorMetadata, RemoteFolderDescriptor, WorkspaceMode } from './core/types';

const STATUS_BAR_COMMAND = 'codexSshfsBridge.showMirrorStatus';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = STATUS_BAR_COMMAND;
  context.subscriptions.push(statusBarItem);

  const refreshStatusBar = async (): Promise<void> => {
    const environment = await getWorkspaceEnvironment();
    const mode = detectWorkspaceMode({
      remoteFolders: environment.remoteFolders,
      metadata: environment.metadata
    });

    updateStatusBar(statusBarItem, mode, environment.remoteFolders.length);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('codexSshfsBridge.syncWorkspaceToMirror', async () => {
      await syncWorkspaceToMirror();
      await refreshStatusBar();
    }),
    vscode.commands.registerCommand('codexSshfsBridge.openMirrorWorkspace', async () => {
      await openMirrorWorkspace();
      await refreshStatusBar();
    }),
    vscode.commands.registerCommand('codexSshfsBridge.syncMirrorToRemote', async () => {
      await syncMirrorToRemote();
      await refreshStatusBar();
    }),
    vscode.commands.registerCommand(STATUS_BAR_COMMAND, async () => {
      await showMirrorStatus();
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void refreshStatusBar();
    })
  );

  await refreshStatusBar();
  await maybePromptForMirror();
}

export function deactivate(): void {}

async function maybePromptForMirror(): Promise<void> {
  const config = getConfiguration();
  if (!config.autoPromptOnRemoteWorkspace) {
    return;
  }

  const environment = await getWorkspaceEnvironment();
  if (detectWorkspaceMode({ remoteFolders: environment.remoteFolders, metadata: environment.metadata }) !== 'remote') {
    return;
  }

  const choice = await vscode.window.showInformationMessage(
    'Codex SSH FS Bridge detected an SSH FS workspace. Create a local mirror so Codex can work on a local folder?',
    'Create mirror',
    'Later'
  );

  if (choice === 'Create mirror') {
    await syncWorkspaceToMirror();
  }
}

async function syncWorkspaceToMirror(): Promise<void> {
  const config = getConfiguration();
  const environment = await getWorkspaceEnvironment();
  const mode = detectWorkspaceMode({ remoteFolders: environment.remoteFolders, metadata: environment.metadata });

  if (mode === 'idle') {
    void vscode.window.showWarningMessage('No supported SSH FS workspace was detected, and no Codex mirror metadata is open.');
    return;
  }

  if (mode === 'mirror') {
    const confirm = await vscode.window.showWarningMessage(
      'Pulling from the remote workspace will overwrite diverged files in the local mirror. Continue?',
      { modal: true },
      'Pull changes'
    );
    if (confirm !== 'Pull changes') {
      return;
    }

    await syncMetadataBackedWorkspace(environment.metadata!, config);
    return;
  }

  const layout = createMirrorLayout(config.mirrorsRoot, getWorkspaceName(), environment.remoteFolders);
  for (const folder of environment.remoteFolders) {
    const mapping = layout.folders.find((item) => item.remoteUri === folder.uri);
    if (!mapping) {
      continue;
    }

    await withProgress(`Syncing ${folder.name} to local mirror`, async () => {
      const report = await syncRemoteToLocal({
        remoteRoot: vscode.Uri.parse(folder.uri),
        localRoot: mapping.mirrorPath,
        maxFileSizeBytes: config.maxFileSizeBytes
      });
      void vscode.window.setStatusBarMessage(`Codex SSH FS Bridge synced ${folder.name}: +${report.created} ~${report.updated} (${report.skipped} skipped)`, 5000);
    });
  }

  await refreshMirrorMetadata(layout, environment.metadata, getWorkspaceName());
  await writeWorkspaceFile(layout);

  const openMirror = config.openMirrorAfterSync
    ? 'Open mirror'
    : undefined;

  const choice = await vscode.window.showInformationMessage(
    `Local mirror ready at ${layout.mirrorRoot}.`,
    ...(openMirror ? [openMirror] : [])
  );

  if (choice === 'Open mirror') {
    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(layout.workspaceFilePath), { forceNewWindow: true });
  }
}

async function openMirrorWorkspace(): Promise<void> {
  const config = getConfiguration();
  const environment = await getWorkspaceEnvironment();
  const mode = detectWorkspaceMode({ remoteFolders: environment.remoteFolders, metadata: environment.metadata });

  if (mode === 'mirror' && environment.metadata) {
    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(environment.metadata.workspaceFilePath), { forceNewWindow: false });
    return;
  }

  if (mode !== 'remote') {
    void vscode.window.showWarningMessage('Open Mirror Workspace works only from a supported remote workspace or an existing mirror workspace.');
    return;
  }

  const layout = createMirrorLayout(config.mirrorsRoot, getWorkspaceName(), environment.remoteFolders);
  await writeWorkspaceFile(layout);
  await refreshMirrorMetadata(layout, environment.metadata, getWorkspaceName());
  await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(layout.workspaceFilePath), { forceNewWindow: true });
}

async function syncMirrorToRemote(): Promise<void> {
  const config = getConfiguration();
  const environment = await getWorkspaceEnvironment();
  const mode = detectWorkspaceMode({ remoteFolders: environment.remoteFolders, metadata: environment.metadata });

  if (mode !== 'mirror' || !environment.metadata) {
    void vscode.window.showWarningMessage('Open a Codex SSH FS local mirror workspace before pushing changes back to the remote SSH FS workspace.');
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    'Sync local mirror changes back to the remote workspace?',
    { modal: true },
    'Push changes'
  );
  if (confirm !== 'Push changes') {
    return;
  }

  for (const folder of environment.metadata.folders) {
    await withProgress(`Syncing ${folder.name} back to remote`, async () => {
      const report = await syncLocalToRemote({
        localRoot: folder.mirrorPath,
        remoteRoot: vscode.Uri.parse(folder.remoteUri),
        maxFileSizeBytes: config.maxFileSizeBytes
      });
      void vscode.window.setStatusBarMessage(`Codex SSH FS Bridge pushed ${folder.name}: +${report.created} ~${report.updated} (${report.skipped} skipped)`, 5000);
    });
  }

  const layout = createMirrorLayout(config.mirrorsRoot, environment.metadata.workspaceName, environment.metadata.folders.map((folder) => ({
    name: folder.name,
    uri: folder.remoteUri,
    scheme: folder.remoteScheme,
    authority: vscode.Uri.parse(folder.remoteUri).authority,
    path: vscode.Uri.parse(folder.remoteUri).path
  })));
  await refreshMirrorMetadata(layout, environment.metadata, environment.metadata.workspaceName);
  void vscode.window.showInformationMessage('Remote workspace updated from the local mirror.');
}

async function showMirrorStatus(): Promise<void> {
  const environment = await getWorkspaceEnvironment();
  const mode = detectWorkspaceMode({ remoteFolders: environment.remoteFolders, metadata: environment.metadata });

  if (mode === 'remote') {
    const folders = environment.remoteFolders.map((folder) => `${folder.name} (${folder.scheme}://${folder.authority}${folder.path})`).join('\n');
    void vscode.window.showInformationMessage(`Remote SSH FS workspace detected:\n${folders}`);
    return;
  }

  if (mode === 'mirror' && environment.metadata) {
    const folders = environment.metadata.folders.map((folder) => `${folder.name} -> ${folder.mirrorPath}`).join('\n');
    void vscode.window.showInformationMessage(`Codex mirror workspace:\n${folders}`);
    return;
  }

  void vscode.window.showInformationMessage('Codex SSH FS Bridge is idle: no supported remote or mirror workspace detected.');
}

function updateStatusBar(statusBarItem: vscode.StatusBarItem, mode: WorkspaceMode, remoteFolderCount: number): void {
  if (mode === 'remote') {
    statusBarItem.text = `$(cloud-download) SSH FS → Codex (${remoteFolderCount})`;
    statusBarItem.tooltip = 'Sync the SSH FS workspace into a local mirror that Codex CLI can use.';
    statusBarItem.show();
    return;
  }

  if (mode === 'mirror') {
    statusBarItem.text = '$(sync) Codex Mirror';
    statusBarItem.tooltip = 'This workspace is a local Codex mirror; use the bridge commands to push or refresh changes.';
    statusBarItem.show();
    return;
  }

  statusBarItem.hide();
}

function getWorkspaceName(): string {
  return vscode.workspace.name ?? 'sshfs-workspace';
}

function getConfiguration(): BridgeConfiguration {
  const config = vscode.workspace.getConfiguration('codexSshfsBridge');
  const configuredMirrorRoot = config.get<string>('mirrorsRoot', '').trim();
  const allowedSchemes = config.get<string[]>('allowedSchemes', ['ssh', 'sshfs', 'sftp']);
  const maxFileSizeMb = config.get<number>('maxFileSizeMb', 16);

  return {
    mirrorsRoot: configuredMirrorRoot || path.join(os.homedir(), '.codex-sshfs-bridge', 'mirrors'),
    allowedSchemes,
    autoPromptOnRemoteWorkspace: config.get<boolean>('autoPromptOnRemoteWorkspace', true),
    openMirrorAfterSync: config.get<boolean>('openMirrorAfterSync', true),
    maxFileSizeBytes: Math.max(1, maxFileSizeMb) * 1024 * 1024
  };
}

async function getWorkspaceEnvironment(): Promise<{
  metadata: MirrorMetadata | undefined;
  remoteFolders: RemoteFolderDescriptor[];
}> {
  const metadata = await readCurrentMirrorMetadata();
  const config = getConfiguration();
  const remoteFolders = (vscode.workspace.workspaceFolders ?? [])
    .filter((folder) => isSupportedRemoteScheme(folder.uri.scheme, config.allowedSchemes))
    .map((folder) => ({
      name: folder.name,
      uri: folder.uri.toString(),
      scheme: folder.uri.scheme,
      authority: folder.uri.authority,
      path: folder.uri.path
    }));

  return { metadata, remoteFolders };
}

async function readCurrentMirrorMetadata(): Promise<MirrorMetadata | undefined> {
  const workspaceFile = vscode.workspace.workspaceFile;
  if (!workspaceFile || workspaceFile.scheme !== 'file') {
    return undefined;
  }

  const metadataPath = path.join(path.dirname(workspaceFile.fsPath), '.codex-sshfs-bridge', 'workspace.json');
  return loadMirrorMetadata(metadataPath);
}

async function syncMetadataBackedWorkspace(metadata: MirrorMetadata, config: BridgeConfiguration): Promise<void> {
  for (const folder of metadata.folders) {
    await withProgress(`Refreshing ${folder.name} from remote`, async () => {
      const report = await syncRemoteToLocal({
        remoteRoot: vscode.Uri.parse(folder.remoteUri),
        localRoot: folder.mirrorPath,
        maxFileSizeBytes: config.maxFileSizeBytes
      });
      void vscode.window.setStatusBarMessage(`Codex SSH FS Bridge refreshed ${folder.name}: +${report.created} ~${report.updated} (${report.skipped} skipped)`, 5000);
    });
  }

  const remoteFolders = metadata.folders.map((folder) => ({
    name: folder.name,
    uri: folder.remoteUri,
    scheme: folder.remoteScheme,
    authority: vscode.Uri.parse(folder.remoteUri).authority,
    path: vscode.Uri.parse(folder.remoteUri).path
  }));
  const layout = createMirrorLayout(config.mirrorsRoot, metadata.workspaceName, remoteFolders);
  await refreshMirrorMetadata(layout, metadata, metadata.workspaceName);
  void vscode.window.showInformationMessage('Local mirror refreshed from the remote SSH FS workspace.');
}

async function withProgress<T>(title: string, task: () => Promise<T>): Promise<T> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false
    },
    task
  );
}
