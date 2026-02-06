export type VfsPath = string;

export type VfsOp = 'ls' | 'read' | 'write' | 'edit' | 'glob' | 'grep';

export interface VfsStat {
  kind: 'file' | 'dir';
  size?: number;
  mtimeMs?: number;
}

export interface VfsEditPatch {
  start: number;
  end: number;
  text: string;
}
