import type { MirrorMetadata, RemoteFolderDescriptor, WorkspaceMode } from './types';

export function normalizeSchemes(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function isSupportedRemoteScheme(scheme: string, allowedSchemes: string[]): boolean {
  return normalizeSchemes(allowedSchemes).includes(scheme.trim().toLowerCase());
}

export function detectWorkspaceMode(args: {
  remoteFolders: RemoteFolderDescriptor[];
  metadata: MirrorMetadata | undefined;
}): WorkspaceMode {
  if (args.metadata) {
    return 'mirror';
  }

  if (args.remoteFolders.length > 0) {
    return 'remote';
  }

  return 'idle';
}
