import { minimatch } from 'minimatch';

import type { VfsBackend, VfsEditPatch, VfsStat } from '../backend';
import { normalizeVfsPath } from '../router';

export class MemoryVfsBackend implements VfsBackend {
  readonly id: string;
  private readonly files = new Map<string, string>();

  constructor(id: string = 'memory') {
    this.id = id;
  }

  async ls(vfsPath: string): Promise<string[]> {
    const target = normalizeVfsPath(vfsPath);
    const children = new Set<string>();

    for (const filePath of this.files.keys()) {
      if (filePath === target) {
        continue;
      }
      if (filePath.startsWith(`${target}/`)) {
        const remainder = filePath.slice(target.length + 1);
        const [child] = remainder.split('/');
        if (child) {
          children.add(child);
        }
      }
    }

    return Array.from(children).sort();
  }

  async stat(vfsPath: string): Promise<VfsStat> {
    const target = normalizeVfsPath(vfsPath);
    const content = this.files.get(target);
    if (content !== undefined) {
      return { kind: 'file', size: content.length };
    }

    const hasChildren = Array.from(this.files.keys()).some((filePath) =>
      filePath.startsWith(`${target}/`),
    );

    if (hasChildren) {
      return { kind: 'dir' };
    }

    throw new Error('VFS_PATH_NOT_FOUND');
  }

  async readFile(vfsPath: string): Promise<string> {
    const target = normalizeVfsPath(vfsPath);
    const content = this.files.get(target);
    if (content === undefined) {
      throw new Error('VFS_PATH_NOT_FOUND');
    }
    return content;
  }

  async writeFile(vfsPath: string, content: string): Promise<void> {
    const target = normalizeVfsPath(vfsPath);
    this.files.set(target, content);
  }

  async editFile(vfsPath: string, patch: VfsEditPatch): Promise<void> {
    const content = await this.readFile(vfsPath);
    const lines = content.split('\n');
    const next = [
      ...lines.slice(0, patch.start),
      patch.text,
      ...lines.slice(patch.end),
    ].join('\n');
    this.files.set(normalizeVfsPath(vfsPath), next);
  }

  async glob(pattern: string): Promise<string[]> {
    const normalizedPattern = normalizeVfsPath(pattern);
    return Array.from(this.files.keys())
      .filter((filePath) =>
        minimatch(filePath, normalizedPattern, { dot: true }),
      )
      .sort();
  }

  async grep(
    query: string,
    root: string,
  ): Promise<Array<{ path: string; line: number; text: string }>> {
    const rootPath = normalizeVfsPath(root);
    const matches: Array<{ path: string; line: number; text: string }> = [];

    for (const [filePath, content] of this.files.entries()) {
      if (!filePath.startsWith(rootPath)) {
        continue;
      }
      const lines = content.split('\n');
      lines.forEach((lineText, index) => {
        if (lineText.includes(query)) {
          matches.push({ path: filePath, line: index + 1, text: lineText });
        }
      });
    }

    return matches;
  }
}
