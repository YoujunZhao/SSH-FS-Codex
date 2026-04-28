export interface RemoteFolderDescriptor {
  name: string;
  uri: string;
  scheme: string;
  authority: string;
  path: string;
}

export interface MirrorFolderMapping {
  name: string;
  remoteUri: string;
  remoteScheme: string;
  mirrorPath: string;
}

export interface MirrorMetadata {
  version: 1;
  workspaceName: string;
  createdAt: string;
  updatedAt: string;
  mirrorRoot: string;
  workspaceFilePath: string;
  folders: MirrorFolderMapping[];
}

export interface MirrorLayout {
  mirrorRoot: string;
  foldersRoot: string;
  workspaceFilePath: string;
  metadataPath: string;
  folders: MirrorFolderMapping[];
}

export interface SyncReport {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  skippedEntries: string[];
}

export interface BridgeConfiguration {
  mirrorsRoot: string;
  allowedSchemes: string[];
  autoPromptOnRemoteWorkspace: boolean;
  openMirrorAfterSync: boolean;
  showProgressNotifications: boolean;
  showStatusBarItem: boolean;
  maxFileSizeBytes: number;
}

export type WorkspaceMode = 'idle' | 'remote' | 'mirror';
