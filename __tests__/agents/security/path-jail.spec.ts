import { describe, it, expect } from 'vitest';
import { assertWithinWorkspace } from '../../../agents/openclaw_plane/sandbox/workspaceJail';
import * as path from 'path';

describe('workspaceJail', () => {
  const root = path.resolve('/tmp/workspace');

  it('should allow paths within workspace', () => {
    const safePath = assertWithinWorkspace(root, 'safe/file.txt');
    expect(safePath).toBe(path.resolve(root, 'safe/file.txt'));
  });

  it('should block paths escaping workspace', () => {
    expect(() => assertWithinWorkspace(root, '../etc/passwd')).toThrowError('WORKSPACE_ESCAPE_BLOCKED');
  });

  it('should block absolute paths outside workspace', () => {
    expect(() => assertWithinWorkspace(root, '/etc/passwd')).toThrowError('WORKSPACE_ESCAPE_BLOCKED');
  });
});
