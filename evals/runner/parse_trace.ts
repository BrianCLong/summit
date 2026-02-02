import fs from 'node:fs/promises';
import { TraceEvent } from './types.js';

export const parseTrace = async (tracePath: string): Promise<TraceEvent[]> => {
  const raw = await fs.readFile(tracePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line) => JSON.parse(line) as TraceEvent);
};
