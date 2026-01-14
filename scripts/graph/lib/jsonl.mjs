import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

export function readJsonLines(filePath) {
  const contents = fs.readFileSync(filePath, 'utf8');
  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

export function writeJsonLines(filePath, rows) {
  ensureDir(path.dirname(filePath));
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });
  for (const row of rows) {
    stream.write(`${JSON.stringify(row)}\n`);
  }
  stream.end();
}
