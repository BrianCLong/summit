import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeTextFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function stableStringifyValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableStringifyValue);
  }

  if (value && typeof value === 'object') {
    const sortedEntries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return Object.fromEntries(
      sortedEntries.map(([key, nestedValue]) => [key, stableStringifyValue(nestedValue)]),
    );
  }

  return value;
}

export function writeJsonFile(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  const normalized = stableStringifyValue(data);
  const serialized = `${JSON.stringify(normalized, null, 2)}\n`;
  fs.writeFileSync(filePath, serialized, 'utf8');
}

export function listFilesRecursively(
  rootDir: string,
  opts?: {
    include?: RegExp;
    exclude?: RegExp;
  },
): string[] {
  const files: string[] = [];

  function visit(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (opts?.exclude && opts.exclude.test(fullPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }

      if (!opts?.include || opts.include.test(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  visit(rootDir);
  return files.sort((a, b) => a.localeCompare(b));
}

export function toPosixRelative(baseDir: string, absolutePath: string): string {
  return path.relative(baseDir, absolutePath).split(path.sep).join('/');
}
