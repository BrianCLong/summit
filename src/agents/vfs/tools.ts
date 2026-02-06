import type { VfsEditPatch } from './backend';
import type { VfsRouter } from './router';

export interface VfsTools {
  vfsLs(path: string): Promise<string[]>;
  vfsRead(path: string): Promise<string>;
  vfsWrite(path: string, content: string): Promise<void>;
  vfsEdit(path: string, patch: VfsEditPatch): Promise<void>;
  vfsGlob(pattern: string): Promise<string[]>;
  vfsGrep(
    query: string,
    root: string,
  ): Promise<Array<{ path: string; line: number; text: string }>>;
}

export function createVfsTools(router: VfsRouter): VfsTools {
  return {
    vfsLs: (path) =>
      router.run('ls', path, (backend, backendPath) =>
        backend.ls(backendPath),
      ),
    vfsRead: (path) =>
      router.run('read', path, (backend, backendPath) =>
        backend.readFile(backendPath),
      ),
    vfsWrite: (path, content) =>
      router.run('write', path, (backend, backendPath) =>
        backend.writeFile(backendPath, content),
      ),
    vfsEdit: (path, patch) =>
      router.run('edit', path, (backend, backendPath) =>
        backend.editFile(backendPath, patch),
      ),
    vfsGlob: (pattern) =>
      router.run('glob', pattern, (backend, backendPath) =>
        backend.glob(backendPath),
      ),
    vfsGrep: (query, root) =>
      router.run('grep', root, (backend, backendPath) =>
        backend.grep(query, backendPath),
      ),
  };
}
