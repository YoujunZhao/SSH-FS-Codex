import fs from 'node:fs/promises';
import path from 'node:path';

import type { MirrorLayout, MirrorMetadata } from './types';

export async function writeMirrorMetadata(layout: MirrorLayout, workspaceName: string): Promise<MirrorMetadata> {
  const now = new Date().toISOString();
  const metadata: MirrorMetadata = {
    version: 1,
    workspaceName,
    createdAt: now,
    updatedAt: now,
    mirrorRoot: layout.mirrorRoot,
    workspaceFilePath: layout.workspaceFilePath,
    folders: layout.folders
  };

  await fs.mkdir(path.dirname(layout.metadataPath), { recursive: true });
  await fs.writeFile(layout.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

  return metadata;
}

export async function refreshMirrorMetadata(layout: MirrorLayout, existing: MirrorMetadata | undefined, workspaceName: string): Promise<MirrorMetadata> {
  const now = new Date().toISOString();
  const metadata: MirrorMetadata = {
    version: 1,
    workspaceName,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    mirrorRoot: layout.mirrorRoot,
    workspaceFilePath: layout.workspaceFilePath,
    folders: layout.folders
  };

  await fs.mkdir(path.dirname(layout.metadataPath), { recursive: true });
  await fs.writeFile(layout.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

  return metadata;
}

export async function loadMirrorMetadata(metadataPath: string): Promise<MirrorMetadata | undefined> {
  try {
    const contents = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(contents) as MirrorMetadata;
  } catch {
    return undefined;
  }
}

export async function writeWorkspaceFile(layout: MirrorLayout): Promise<void> {
  const workspace = {
    folders: layout.folders.map((folder) => ({
      path: path.relative(layout.mirrorRoot, folder.mirrorPath)
    })),
    settings: {
      'files.watcherExclude': {
        '**/.codex-sshfs-bridge/**': true
      },
      'codexSshfsBridge.mode': 'mirror',
      'codexSshfsBridge.metadataFile': path.relative(layout.mirrorRoot, layout.metadataPath)
    }
  };

  await fs.mkdir(layout.mirrorRoot, { recursive: true });
  await fs.writeFile(layout.workspaceFilePath, `${JSON.stringify(workspace, null, 2)}\n`, 'utf8');
}
