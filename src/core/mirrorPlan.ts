import path from 'node:path';

import type { WorkspaceFolderLike } from './detect';

export interface MirrorPlanInput {
  folder: WorkspaceFolderLike;
  baseDirectory: string;
}

export interface MirrorPlan {
  workspaceKey: string;
  targetPath: string;
  remoteRoot: string;
  displayName: string;
}

export function sanitizeSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'workspace';
}

export function buildMirrorPlan({ folder, baseDirectory }: MirrorPlanInput): MirrorPlan {
  const authority = sanitizeSegment(folder.uri.authority || folder.name);
  const pathSegments = folder.uri.path
    .split('/')
    .filter(Boolean)
    .map((segment) => sanitizeSegment(segment));
  const workspaceKey = [authority, ...pathSegments].join('-');

  return {
    workspaceKey,
    targetPath: path.join(baseDirectory, workspaceKey),
    remoteRoot: folder.uri.path,
    displayName: `${folder.name} → ${authority}:${folder.uri.path}`
  };
}
