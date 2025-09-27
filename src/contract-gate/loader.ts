import { promises as fs } from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import type { DataContract } from './types';

async function readFileMaybe(filePath: string): Promise<string> {
  const contents = await fs.readFile(filePath, 'utf8');
  return contents;
}

export async function loadContract(contractPath: string): Promise<DataContract> {
  const resolved = path.resolve(contractPath);
  const contents = await readFileMaybe(resolved);
  const ext = path.extname(resolved).toLowerCase();
  let raw: unknown;
  if (ext === '.yaml' || ext === '.yml') {
    raw = loadYaml(contents);
  } else {
    raw = JSON.parse(contents);
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Unable to parse data contract at ${resolved}`);
  }
  return raw as DataContract;
}

export async function writeFileRecursive(targetPath: string, body: string): Promise<void> {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, body, 'utf8');
}

export async function writeJsonRecursive(targetPath: string, value: unknown): Promise<void> {
  await writeFileRecursive(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}
