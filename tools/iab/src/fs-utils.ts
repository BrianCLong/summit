import { promises as fs } from 'fs';
import path from 'path';

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.zip',
  '.tar',
  '.tgz',
  '.gz',
  '.pdf'
]);

interface FileReadResult {
  buffer: Buffer;
  content: string;
  isBinary: boolean;
}

export async function readFileWithEncoding(filePath: string): Promise<FileReadResult> {
  const resolved = path.resolve(filePath);
  const buffer = await fs.readFile(resolved);
  const ext = path.extname(resolved).toLowerCase();
  const isBinary = BINARY_EXTENSIONS.has(ext);
  const content = buffer.toString('utf8');

  return { buffer, content, isBinary };
}
