import fs from 'fs';
import path from 'path';

const baseDir = path.resolve(process.cwd(), 'artifacts/exports');

export function ensureExportDir() {
  fs.mkdirSync(baseDir, { recursive: true });
}

export function putObject(id: string, content: Buffer) {
  ensureExportDir();
  const file = path.join(baseDir, id);
  fs.writeFileSync(file, content);
  return file;
}

export function getObjectPath(id: string) {
  return path.join(baseDir, id);
}

