import { MemoryVfsBackend } from '../../../src/agents/vfs/backends/memory';
import { VfsRouter, normalizeVfsPath } from '../../../src/agents/vfs/router';

const memoryBackend = new MemoryVfsBackend();

describe('VfsRouter', () => {
  it('rejects relative paths', () => {
    expect(() => normalizeVfsPath('workspace/file')).toThrow(
      'VFS_PATH_MUST_BE_ABSOLUTE',
    );
  });

  it('rejects traversal segments', () => {
    expect(() => normalizeVfsPath('/workspace/../secrets')).toThrow(
      'VFS_TRAVERSAL_DENY',
    );
  });

  it('picks the longest prefix match', () => {
    const router = new VfsRouter([
      { prefix: '/workspace', backend: memoryBackend, mode: 'rw' },
      { prefix: '/workspace/project', backend: memoryBackend, mode: 'ro' },
    ]);

    const mount = router.resolve('/workspace/project/file.txt');
    expect(mount.prefix).toBe('/workspace/project');
    expect(mount.mode).toBe('ro');
  });
});
