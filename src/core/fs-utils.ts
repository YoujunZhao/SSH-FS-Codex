import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function hashBuffer(buffer: Uint8Array): Promise<string> {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

export async function hashLocalFile(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return hashBuffer(buffer);
}

export async function ensureLocalDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readLocalDirectoryRecursively(rootPath: string): Promise<string[]> {
  const entries: string[] = [];

  async function walk(currentPath: string, prefix = ''): Promise<void> {
    const children = await fs.readdir(currentPath, { withFileTypes: true });
    for (const child of children) {
      const childPath = path.join(currentPath, child.name);
      const relativePath = prefix ? path.join(prefix, child.name) : child.name;
      if (child.isDirectory()) {
        await walk(childPath, relativePath);
      } else if (child.isFile()) {
        entries.push(relativePath);
      }
    }
  }

  if (await fileExists(rootPath)) {
    await walk(rootPath);
  }

  return entries.sort();
}
