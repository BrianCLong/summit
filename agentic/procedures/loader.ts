import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import type { Procedure } from './types';

export async function loadProcedureFromFile(path: string): Promise<Procedure> {
  const procedurePath = resolve(path);
  const contents = await readFile(procedurePath, 'utf8');
  return parse(contents) as Procedure;
}
