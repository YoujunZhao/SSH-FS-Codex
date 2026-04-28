import test from 'node:test';
import assert from 'node:assert/strict';

import { detectWorkspaceMode, isSupportedRemoteScheme, normalizeSchemes } from '../src/core/detection';
import { createMirrorLayout } from '../src/core/pathing';

void test('normalizeSchemes lowercases and trims values', () => {
  assert.deepEqual(normalizeSchemes([' SSH ', 'sshfs', '', 'SFTP']), ['ssh', 'sshfs', 'sftp']);
});

void test('isSupportedRemoteScheme matches configured schemes case-insensitively', () => {
  assert.equal(isSupportedRemoteScheme('SSH', ['ssh', 'sftp']), true);
  assert.equal(isSupportedRemoteScheme('ftp', ['ssh', 'sftp']), false);
});

void test('detectWorkspaceMode prefers mirror metadata over remote folder detection', () => {
  const layout = createMirrorLayout('/tmp/mirrors', 'Demo Workspace', [{
    name: 'app',
    uri: 'ssh://server/home/demo/app',
    scheme: 'ssh',
    authority: 'server',
    path: '/home/demo/app'
  }]);

  assert.equal(detectWorkspaceMode({
    remoteFolders: [{
      name: 'app',
      uri: 'ssh://server/home/demo/app',
      scheme: 'ssh',
      authority: 'server',
      path: '/home/demo/app'
    }],
    metadata: {
      version: 1,
      workspaceName: 'Demo Workspace',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      mirrorRoot: layout.mirrorRoot,
      workspaceFilePath: layout.workspaceFilePath,
      folders: layout.folders
    }
  }), 'mirror');
});

void test('createMirrorLayout creates stable mirror paths', () => {
  const layout = createMirrorLayout('/tmp/mirrors', 'Demo Workspace', [{
    name: 'app',
    uri: 'ssh://server/home/demo/app',
    scheme: 'ssh',
    authority: 'server',
    path: '/home/demo/app'
  }]);

  assert.match(layout.mirrorRoot, /demo-workspace-[a-f0-9]{10}$/);
  assert.equal(layout.folders[0]?.mirrorPath.includes('app-'), true);
});
