import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const seededEvidenceDir = path.join(
  root,
  'tests/graphrag/narrativeops/evidence.golden/seeded_minimal',
);
const negativeEvidenceDir = path.join(
  root,
  'tests/graphrag/narrativeops/evidence.golden/negative_timestamp',
);
const timestampPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

for (const file of ['report.json', 'metrics.json', 'evidence/index.json']) {
  const filePath = path.join(seededEvidenceDir, file);
  const text = fs.readFileSync(filePath, 'utf8');
  assert(!timestampPattern.test(text), `timestamp leaked in ${file}`);
}

const indexPath = path.join(seededEvidenceDir, 'evidence/index.json');
const indexPayload = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

for (const entry of indexPayload.entries) {
  for (const file of entry.files) {
    const filePath = path.join(seededEvidenceDir, file);
    const digest = sha256File(filePath);
    assert(entry.sha256[file] === digest, `hash mismatch for ${file}`);
  }
}

const positiveResult = spawnSync(
  'node',
  ['.github/scripts/verify-narrativeops-evidence.mjs', 'tests/graphrag/narrativeops/evidence.golden/seeded_minimal'],
  { cwd: root },
);
assert(positiveResult.status === 0, 'seeded fixture must pass verifier script');

const negativeResult = spawnSync(
  'node',
  ['.github/scripts/verify-narrativeops-evidence.mjs', 'tests/graphrag/narrativeops/evidence.golden/negative_timestamp'],
  { cwd: root },
);
assert(
  negativeResult.status !== 0,
  'negative fixture must fail verifier script checks',
);

console.log('narrativeops verify-evidence checks passed');
