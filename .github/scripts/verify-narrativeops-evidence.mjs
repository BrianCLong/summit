import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function sha256File(p) {
  const buffer = fs.readFileSync(p);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const root = process.cwd();
const evidenceDir =
  process.argv[2] ||
  'tests/graphrag/narrativeops/evidence.golden/seeded_minimal';

const stampPath = path.join(root, evidenceDir, 'stamp.json');
assert(fs.existsSync(stampPath), 'stamp.json missing');

for (const file of ['report.json', 'metrics.json', 'evidence/index.json']) {
  const filePath = path.join(root, evidenceDir, file);
  assert(fs.existsSync(filePath), `${file} missing`);
  const text = fs.readFileSync(filePath, 'utf8');
  assert(
    !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(text),
    `timestamp found in ${file}`,
  );
}

const indexPath = path.join(root, evidenceDir, 'evidence/index.json');
const indexPayload = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
assert(Array.isArray(indexPayload.entries), 'index.json must have entries[]');

for (const entry of indexPayload.entries) {
  for (const file of entry.files) {
    const filePath = path.join(root, evidenceDir, file);
    assert(fs.existsSync(filePath), `indexed file missing: ${file}`);
    const digest = sha256File(filePath);
    assert(
      entry.sha256 && entry.sha256[file] === digest,
      `hash mismatch for ${file}`,
    );
  }
}

console.log('narrativeops evidence verified:', evidenceDir);
