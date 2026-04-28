export function findRemoteFilesDeletedLocally(args: {
  remoteFiles: readonly string[];
  localFiles: readonly string[];
}): string[] {
  const localFileSet = new Set(args.localFiles);

  return args.remoteFiles
    .filter((remoteFile) => !localFileSet.has(remoteFile))
    .sort();
}
