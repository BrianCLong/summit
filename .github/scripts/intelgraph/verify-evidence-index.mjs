import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const indexPath = path.join(repoRoot, 'evidence', 'index.json');

if (!existsSync(indexPath)) {
  console.error('Missing evidence/index.json');
  process.exit(1);
}

const raw = readFileSync(indexPath, 'utf8');
const parsed = JSON.parse(raw);

if (!parsed || !Array.isArray(parsed.items)) {
  console.error('Evidence index missing items array');
  process.exit(1);
}

const missing = [];

for (const item of parsed.items) {
  if (!item?.evidence_id || !item?.files) {
    missing.push(`Invalid entry: ${JSON.stringify(item)}`);
    continue;
  }

  for (const key of ['report', 'metrics', 'stamp']) {
    const relPath = item.files[key];
    if (!relPath) {
      missing.push(`${item.evidence_id}: missing ${key} path`);
      continue;
    }
    const absPath = path.join(repoRoot, relPath);
    if (!existsSync(absPath)) {
      missing.push(`${item.evidence_id}: missing file ${relPath}`);
    }
  }
}

if (missing.length > 0) {
  console.error(`Evidence index verification failed:\n${missing.join('\n')}`);
  process.exit(1);
}

console.log('Evidence index verification passed.');
