import fs from 'node:fs';
import path from 'node:path';

export async function findFilesByGlob(rootDir: string, globs: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const pattern of globs) {
    if (pattern.startsWith('**')) {
      const trimmed = pattern.replace('**', '').replace('/*', '').replace('*', '');
      files.push(...walkForExtension(rootDir, trimmed));
    } else {
      const candidate = path.resolve(rootDir, pattern);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        files.push(candidate);
      }
    }
  }
  return Array.from(new Set(files));
}

function walkForExtension(rootDir: string, extension: string): string[] {
  const results: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        if (entry.name.endsWith(extension) || extension === '') {
          results.push(fullPath);
        }
      }
    }
  }
  return results;
}
