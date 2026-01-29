import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const ensureDir = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
};

export const writeJson = async (
  filePath: string,
  data: unknown,
): Promise<void> => {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

export const readJson = async <T>(filePath: string): Promise<T> => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
};

export const sha256File = async (filePath: string): Promise<string> => {
  const content = await fs.readFile(filePath);
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return hash.digest('hex');
};

export const listFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listFiles(fullPath);
      }
      return [fullPath];
    }),
  );
  return files.flat();
};
