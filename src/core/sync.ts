import fs from 'node:fs/promises';
import path from 'node:path';
import posixPath from 'node:path/posix';

export interface RemoteTreeAdapter {
  listDirectory(remotePath: string): Promise<readonly RemoteDirectoryEntry[]>;
  readFile(remotePath: string): Promise<Uint8Array>;
}

export interface RemoteDirectoryEntry {
  name: string;
  kind: 'file' | 'directory';
}

export interface SyncOptions {
  remoteRoot: string;
  targetRoot: string;
  excludeNames: readonly string[];
}

export interface SyncResult {
  filesSynced: number;
  directoriesCreated: number;
  skipped: string[];
}

function assertSafeSegment(segment: string): void {
  if (!segment || segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\')) {
    throw new Error(`Unsafe remote entry name: ${segment}`);
  }
}

async function ensureDirectory(directoryPath: string): Promise<number> {
  try {
    const stats = await fs.stat(directoryPath);
    if (!stats.isDirectory()) {
      throw new Error(`${directoryPath} exists and is not a directory`);
    }

    return 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    await fs.mkdir(directoryPath, { recursive: true });
    return 1;
  }
}

export async function syncRemoteTree(
  adapter: RemoteTreeAdapter,
  options: SyncOptions
): Promise<SyncResult> {
  const excludeNames = new Set(options.excludeNames);
  const result: SyncResult = {
    filesSynced: 0,
    directoriesCreated: 0,
    skipped: []
  };

  async function walk(remoteDirectory: string, localDirectory: string): Promise<void> {
    result.directoriesCreated += await ensureDirectory(localDirectory);
    const entries = [...(await adapter.listDirectory(remoteDirectory))];

    for (const entry of entries) {
      if (excludeNames.has(entry.name)) {
        result.skipped.push(posixPath.join(remoteDirectory, entry.name));
        continue;
      }

      assertSafeSegment(entry.name);
      const nextRemotePath = posixPath.join(remoteDirectory, entry.name);
      const nextLocalPath = path.join(localDirectory, entry.name);

      if (entry.kind === 'directory') {
        await walk(nextRemotePath, nextLocalPath);
        continue;
      }

      const content = await adapter.readFile(nextRemotePath);
      await fs.mkdir(path.dirname(nextLocalPath), { recursive: true });
      await fs.writeFile(nextLocalPath, content);
      result.filesSynced += 1;
    }
  }

  await walk(options.remoteRoot, options.targetRoot);
  return result;
}
