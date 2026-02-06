import { promises as fs } from 'fs';
import path from 'path';
import { minimatch } from 'minimatch';

import type { VfsBackend, VfsEditPatch, VfsStat } from '../backend';

const DEFAULT_ENCODING = 'utf8';

export class LocalVfsBackend implements VfsBackend {
  readonly id: string;
  private readonly rootDir: string;

  constructor(rootDir: string, id: string = 'local') {
    this.rootDir = path.resolve(rootDir);
    this.id = id;
  }

  async ls(vfsPath: string): Promise<string[]> {
    const realPath = this.toRealPath(vfsPath);
    const entries = await fs.readdir(realPath, { withFileTypes: true });
    return entries.map((entry) => entry.name).sort();
  }

  async stat(vfsPath: string): Promise<VfsStat> {
    const realPath = this.toRealPath(vfsPath);
    const stats = await fs.stat(realPath);
    return {
      kind: stats.isDirectory() ? 'dir' : 'file',
      size: stats.isFile() ? stats.size : undefined,
      mtimeMs: stats.mtimeMs,
    };
  }

  async readFile(vfsPath: string): Promise<string> {
    const realPath = this.toRealPath(vfsPath);
    return fs.readFile(realPath, DEFAULT_ENCODING);
  }

  async writeFile(vfsPath: string, content: string): Promise<void> {
    const realPath = this.toRealPath(vfsPath);
    await fs.mkdir(path.dirname(realPath), { recursive: true });
    await fs.writeFile(realPath, content, DEFAULT_ENCODING);
  }

  async editFile(vfsPath: string, patch: VfsEditPatch): Promise<void> {
    const realPath = this.toRealPath(vfsPath);
    const content = await fs.readFile(realPath, DEFAULT_ENCODING);
    const lines = content.split('\n');
    const next = [
      ...lines.slice(0, patch.start),
      patch.text,
      ...lines.slice(patch.end),
    ].join('\n');
    await fs.writeFile(realPath, next, DEFAULT_ENCODING);
  }

  async glob(pattern: string): Promise<string[]> {
    const files = await this.listFiles('/');
    return files.filter((file) => minimatch(file, pattern, { dot: true }));
  }

  async grep(
    query: string,
    root: string,
  ): Promise<Array<{ path: string; line: number; text: string }>> {
    const files = await this.listFiles(root);
    const matches: Array<{ path: string; line: number; text: string }> = [];

    for (const file of files) {
      const content = await this.readFile(file);
      const lines = content.split('\n');
      lines.forEach((lineText, index) => {
        if (lineText.includes(query)) {
          matches.push({ path: file, line: index + 1, text: lineText });
        }
      });
    }

    return matches;
  }

  private toRealPath(vfsPath: string): string {
    const realPath = path.resolve(this.rootDir, `.${vfsPath}`);
    if (!realPath.startsWith(this.rootDir)) {
      throw new Error('VFS_PATH_ESCAPE');
    }
    return realPath;
  }

  private async listFiles(root: string): Promise<string[]> {
    const rootPath = this.toRealPath(root);
    const files: string[] = [];
    const queue: Array<{ dir: string; vfsDir: string }> = [
      { dir: rootPath, vfsDir: root },
    ];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      const entries = await fs.readdir(current.dir, { withFileTypes: true });
      for (const entry of entries) {
        const nextVfs = current.vfsDir.endsWith('/')
          ? `${current.vfsDir}${entry.name}`
          : `${current.vfsDir}/${entry.name}`;
        const nextPath = path.join(current.dir, entry.name);
        if (entry.isDirectory()) {
          queue.push({ dir: nextPath, vfsDir: nextVfs });
        } else if (entry.isFile()) {
          files.push(nextVfs);
        }
      }
    }

    return files.sort();
  }
}
