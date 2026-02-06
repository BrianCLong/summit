import { VfsEditPatch, VfsOp, VfsStat } from './types';

export type { VfsEditPatch, VfsOp, VfsStat } from './types';

export interface VfsBackend {
  readonly id: string;
  ls(path: string): Promise<string[]>;
  stat(path: string): Promise<VfsStat>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  editFile(path: string, patch: VfsEditPatch): Promise<void>;
  glob(pattern: string): Promise<string[]>;
  grep(
    query: string,
    root: string,
  ): Promise<Array<{ path: string; line: number; text: string }>>;
}
