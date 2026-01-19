import fs from 'node:fs/promises';
import path from 'node:path';
import stringify from 'fast-json-stable-stringify';
import { CaptureCursor } from '../capture/types.js';

export async function readCursor(cursorPath: string): Promise<CaptureCursor | null> {
  try {
    const data = await fs.readFile(cursorPath, 'utf-8');
    return JSON.parse(data) as CaptureCursor;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function writeCursor(cursorPath: string, cursor: CaptureCursor): Promise<void> {
  const content = stringify(cursor);
  const tempPath = `${cursorPath}.tmp`;

  await fs.writeFile(tempPath, content, 'utf-8');

  // Try to fsync the file
  const fileHandle = await fs.open(tempPath, 'r+');
  try {
    await fileHandle.sync();
  } finally {
    await fileHandle.close();
  }

  await fs.rename(tempPath, cursorPath);
}
