import crypto from 'node:crypto';
import path from 'node:path';

import type { MirrorLayout, RemoteFolderDescriptor } from './types';

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'workspace';
}

function shortHash(value: string): string {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 10);
}

export function createMirrorLayout(mirrorsRoot: string, workspaceName: string, folders: RemoteFolderDescriptor[]): MirrorLayout {
  const workspaceKey = shortHash(folders.map((folder) => folder.uri).sort().join('|'));
  const workspaceSlug = `${slugify(workspaceName)}-${workspaceKey}`;
  const mirrorRoot = path.join(mirrorsRoot, workspaceSlug);
  const foldersRoot = path.join(mirrorRoot, 'folders');
  const workspaceFilePath = path.join(mirrorRoot, `${workspaceSlug}.code-workspace`);
  const metadataPath = path.join(mirrorRoot, '.codex-sshfs-bridge', 'workspace.json');

  return {
    mirrorRoot,
    foldersRoot,
    workspaceFilePath,
    metadataPath,
    folders: folders.map((folder) => ({
      name: folder.name,
      remoteUri: folder.uri,
      remoteScheme: folder.scheme,
      mirrorPath: path.join(foldersRoot, `${slugify(folder.name)}-${shortHash(folder.uri)}`)
    }))
  };
}
