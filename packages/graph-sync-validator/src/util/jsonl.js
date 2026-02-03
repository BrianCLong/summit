import fs from 'node:fs/promises';

export async function readJsonl(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

export async function writeJsonl(filePath, items) {
  const content = items.map(item => JSON.stringify(item)).join('\n') + '\n';
  await fs.writeFile(filePath, content);
}
