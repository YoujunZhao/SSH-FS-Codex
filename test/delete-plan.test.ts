import test from 'node:test';
import assert from 'node:assert/strict';

import { findRemoteFilesDeletedLocally } from '../src/core/delete-plan';

void test('findRemoteFilesDeletedLocally returns remote files missing from local mirror', () => {
  assert.deepEqual(
    findRemoteFilesDeletedLocally({
      remoteFiles: ['README.md', 'src/removed.ts', 'src/still-here.ts'],
      localFiles: ['README.md', 'src/still-here.ts']
    }),
    ['src/removed.ts']
  );
});

void test('findRemoteFilesDeletedLocally returns an empty list when mirror still has all remote files', () => {
  assert.deepEqual(
    findRemoteFilesDeletedLocally({
      remoteFiles: ['README.md', 'src/index.ts'],
      localFiles: ['README.md', 'src/index.ts', 'src/new-local.ts']
    }),
    []
  );
});
