import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import type { ProcedurePolicy } from './types';

export async function loadPolicyFromFile(path: string): Promise<ProcedurePolicy> {
  const policyPath = resolve(path);
  const contents = await readFile(policyPath, 'utf8');
  return parse(contents) as ProcedurePolicy;
}
