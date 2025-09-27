import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const modulePath = fileURLToPath(import.meta.url);
const packageRoot = dirname(dirname(modulePath));
const fixturesDir = join(packageRoot, 'fixtures');

export async function loadFixture<T = unknown>(name: string): Promise<T> {
  const filePath = join(fixturesDir, name);
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}
