import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { InspectEnv, SpanRef } from '../../api';

export class FSRepoAdapter implements InspectEnv {
  constructor(private rootPath: string, private handleId: string) {}

  async listFiles(prefix?: string): Promise<string[]> {
    const searchPath = prefix ? path.join(this.rootPath, prefix) : this.rootPath;
    // Recursive list (simplified for MVP)
    const files: string[] = [];

    const scan = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(this.rootPath, fullPath);
        if (entry.isDirectory()) {
          if (entry.name !== '.git' && entry.name !== 'node_modules') {
             await scan(fullPath);
          }
        } else {
          files.push(relPath);
        }
      }
    };

    await scan(searchPath);
    return files;
  }

  async readFile(filePath: string, start?: number, end?: number): Promise<{ text: string; span: SpanRef }> {
    const resolvedRoot = path.resolve(this.rootPath);
    const resolvedPath = path.resolve(resolvedRoot, filePath);

    // Safety check: Ensure the resolved path starts with the root path + separator, or IS the root path
    if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
        throw new Error("Access denied: Path traversal attempt");
    }

    const content = await fs.readFile(resolvedPath, 'utf-8');
    const slice = (start !== undefined && end !== undefined)
      ? content.slice(start, end)
      : content;

    const sha256 = createHash('sha256').update(slice).digest('hex');

    return {
      text: slice,
      span: {
        handleId: this.handleId,
        path: filePath,
        start: start ?? 0,
        end: end ?? content.length,
        sha256
      }
    };
  }

  async searchText(pattern: string, opts?: { paths?: string[]; maxHits?: number }): Promise<Array<{ hit: string; span: SpanRef }>> {
    // Basic implementation: iterate and match
    const hits: Array<{ hit: string; span: SpanRef }> = [];
    const files = opts?.paths ?? await this.listFiles();
    const maxHits = opts?.maxHits ?? 10;

    for (const f of files) {
      if (hits.length >= maxHits) break;
      try {
        const { text } = await this.readFile(f);
        const index = text.indexOf(pattern);
        if (index !== -1) {
             // Create a snippet around the hit
             const snippetStart = Math.max(0, index - 20);
             const snippetEnd = Math.min(text.length, index + pattern.length + 20);
             const snippet = text.slice(snippetStart, snippetEnd);

             const sha256 = createHash('sha256').update(snippet).digest('hex');

             hits.push({
               hit: snippet,
               span: {
                 handleId: this.handleId,
                 path: f,
                 start: snippetStart,
                 end: snippetEnd,
                 sha256
               }
             });
        }
      } catch (e) {
        // Ignore read errors during search
      }
    }
    return hits;
  }

  async peek(start: number, len: number): Promise<{ text: string; span: SpanRef }> {
    throw new Error("peek() not supported on FSRepoAdapter (unstructured stream access not available)");
  }

  async chunk(strategy: "byTokens" | "byHeadings" | "byAST" | "bySessions", opts?: any): Promise<Array<{ span: SpanRef }>> {
    throw new Error("chunk() not implemented in basic adapter");
  }
}
