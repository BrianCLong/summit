import { readFile } from 'fs/promises';
import { parseTaskPack, TaskPackParseResult } from './schema.js';

export const loadTaskPack = async (path: string): Promise<TaskPackParseResult> => {
  const raw = await readFile(path, 'utf-8');
  const payload = JSON.parse(raw);
  return parseTaskPack(payload);
};
