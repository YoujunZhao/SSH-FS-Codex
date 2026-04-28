export interface UriLike {
  scheme: string;
  authority: string;
  path: string;
}

export interface WorkspaceFolderLike {
  name: string;
  uri: UriLike;
}

const DEFAULT_REMOTE_SCHEMES = ['sshfs', 'ssh', 'sftp'];

function normalizeScheme(scheme: string): string {
  return scheme.trim().toLowerCase();
}

export function isRemoteScheme(scheme: string, remoteSchemes: readonly string[] = DEFAULT_REMOTE_SCHEMES): boolean {
  const normalizedScheme = normalizeScheme(scheme);
  return remoteSchemes.some((candidate) => normalizeScheme(candidate) === normalizedScheme);
}

export function getRemoteWorkspaceFolder<T extends WorkspaceFolderLike>(
  workspaceFolders: readonly T[] | undefined,
  remoteSchemes: readonly string[] = DEFAULT_REMOTE_SCHEMES
): T | undefined {
  return workspaceFolders?.find((folder) => isRemoteScheme(folder.uri.scheme, remoteSchemes));
}
