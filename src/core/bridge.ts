import fs from 'node:fs/promises';
import path from 'node:path';

import * as vscode from 'vscode';

import { findRemoteFilesDeletedLocally } from './delete-plan';
import { ensureLocalDirectory, fileExists, hashBuffer, hashLocalFile, readLocalDirectoryRecursively } from './fs-utils';
import type { SyncReport } from './types';

function joinRemote(base: vscode.Uri, relativePath: string): vscode.Uri {
  return relativePath ? vscode.Uri.joinPath(base, ...relativePath.split(path.sep)) : base;
}

async function listRemoteFiles(root: vscode.Uri, relativePath = ''): Promise<string[]> {
  const files: string[] = [];
  const entries = await vscode.workspace.fs.readDirectory(joinRemote(root, relativePath));

  for (const [name, type] of entries) {
    const childRelativePath = relativePath ? path.join(relativePath, name) : name;
    if (type & vscode.FileType.SymbolicLink) {
      continue;
    }
    if (type & vscode.FileType.Directory) {
      files.push(...await listRemoteFiles(root, childRelativePath));
      continue;
    }
    if (type & vscode.FileType.File) {
      files.push(childRelativePath);
    }
  }

  return files.sort();
}

async function filesDiffer(remoteUri: vscode.Uri, localPath: string): Promise<boolean> {
  if (!(await fileExists(localPath))) {
    return true;
  }

  const [remoteStat, localStat] = await Promise.all([vscode.workspace.fs.stat(remoteUri), fs.stat(localPath)]);
  if (remoteStat.size !== localStat.size) {
    return true;
  }

  const [remoteHash, localHash] = await Promise.all([
    vscode.workspace.fs.readFile(remoteUri).then(hashBuffer),
    hashLocalFile(localPath)
  ]);
  return remoteHash !== localHash;
}

async function localDiffers(localPath: string, remoteUri: vscode.Uri): Promise<boolean> {
  try {
    const [localStat, remoteStat] = await Promise.all([fs.stat(localPath), vscode.workspace.fs.stat(remoteUri)]);
    if (localStat.size !== remoteStat.size) {
      return true;
    }

    const [localHash, remoteHash] = await Promise.all([
      hashLocalFile(localPath),
      vscode.workspace.fs.readFile(remoteUri).then(hashBuffer)
    ]);
    return localHash !== remoteHash;
  } catch {
    return true;
  }
}

export async function syncRemoteToLocal(options: {
  remoteRoot: vscode.Uri;
  localRoot: string;
  maxFileSizeBytes: number;
}): Promise<SyncReport> {
  const report: SyncReport = { created: 0, updated: 0, deleted: 0, skipped: 0, skippedEntries: [] };
  await ensureLocalDirectory(options.localRoot);

  const remoteFiles = await listRemoteFiles(options.remoteRoot);
  for (const relativePath of remoteFiles) {
    const remoteUri = joinRemote(options.remoteRoot, relativePath);
    const localPath = path.join(options.localRoot, relativePath);
    const stat = await vscode.workspace.fs.stat(remoteUri);

    if (stat.size > options.maxFileSizeBytes) {
      report.skipped += 1;
      report.skippedEntries.push(relativePath);
      continue;
    }

    await ensureLocalDirectory(path.dirname(localPath));
    const exists = await fileExists(localPath);
    if (await filesDiffer(remoteUri, localPath)) {
      const contents = await vscode.workspace.fs.readFile(remoteUri);
      await fs.writeFile(localPath, contents);
      if (exists) {
        report.updated += 1;
      } else {
        report.created += 1;
      }
    }
  }

  return report;
}

export async function syncLocalToRemote(options: {
  localRoot: string;
  remoteRoot: vscode.Uri;
  maxFileSizeBytes: number;
}): Promise<SyncReport> {
  const report: SyncReport = { created: 0, updated: 0, deleted: 0, skipped: 0, skippedEntries: [] };
  const localFiles = await readLocalDirectoryRecursively(options.localRoot);
  const remoteFiles = await listRemoteFiles(options.remoteRoot);

  for (const relativePath of localFiles) {
    const localPath = path.join(options.localRoot, relativePath);
    const localStat = await fs.stat(localPath);
    if (localStat.size > options.maxFileSizeBytes) {
      report.skipped += 1;
      report.skippedEntries.push(relativePath);
      continue;
    }

    const remoteUri = joinRemote(options.remoteRoot, relativePath);
    if (await localDiffers(localPath, remoteUri)) {
      const contents = await fs.readFile(localPath);
      await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(options.remoteRoot, ...path.dirname(relativePath).split(path.sep).filter(Boolean)));
      let existed = false;
      try {
        await vscode.workspace.fs.stat(remoteUri);
        existed = true;
      } catch {
        existed = false;
      }
      await vscode.workspace.fs.writeFile(remoteUri, contents);
      if (existed) {
        report.updated += 1;
      } else {
        report.created += 1;
      }
    }
  }

  for (const relativePath of findRemoteFilesDeletedLocally({ remoteFiles, localFiles })) {
    const remoteUri = joinRemote(options.remoteRoot, relativePath);
    const remoteStat = await vscode.workspace.fs.stat(remoteUri);

    if (remoteStat.size > options.maxFileSizeBytes) {
      report.skipped += 1;
      report.skippedEntries.push(relativePath);
      continue;
    }

    await vscode.workspace.fs.delete(remoteUri, { recursive: false, useTrash: false });
    report.deleted += 1;
  }

  return report;
}
