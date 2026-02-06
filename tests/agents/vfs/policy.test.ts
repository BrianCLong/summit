import { MemoryVfsBackend } from '../../../src/agents/vfs/backends/memory';
import { VfsRouter } from '../../../src/agents/vfs/router';
import { createVfsTools } from '../../../src/agents/vfs/tools';

describe('VFS policy enforcement', () => {
  it('denies write/edit on read-only mounts', async () => {
    const router = new VfsRouter([
      { prefix: '/workspace', backend: new MemoryVfsBackend(), mode: 'ro' },
    ]);
    const tools = createVfsTools(router);

    await expect(
      tools.vfsWrite('/workspace/file.txt', 'data'),
    ).rejects.toThrow('VFS_READ_ONLY');

    await expect(
      tools.vfsEdit('/workspace/file.txt', {
        start: 0,
        end: 1,
        text: 'update',
      }),
    ).rejects.toThrow('VFS_READ_ONLY');
  });

  it('denies policy blocked paths', async () => {
    const router = new VfsRouter(
      [{ prefix: '/workspace', backend: new MemoryVfsBackend(), mode: 'rw' }],
      (op, path) => {
        if (op === 'read' && path.endsWith('/.env')) {
          return { allow: false, reason: 'secret-file' };
        }
        return { allow: true };
      },
    );
    const tools = createVfsTools(router);

    await expect(tools.vfsRead('/workspace/.env')).rejects.toThrow(
      'VFS_POLICY_DENY',
    );
  });
});
