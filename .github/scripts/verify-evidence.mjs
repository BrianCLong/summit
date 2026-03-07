import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const schemaPaths = [
  'docs/evidence/schemas/report.schema.json',
  'docs/evidence/schemas/metrics.schema.json',
  'docs/evidence/schemas/stamp.schema.json',
  'docs/evidence/schemas/index.schema.json',
];

for (const relativePath of schemaPaths) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required schema: ${relativePath}`);
  }
  JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function readJson(relativePath) {
  const payload = fs.readFileSync(path.join(root, relativePath), 'utf8');
  return JSON.parse(payload);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const indexPath = 'tests/fixtures/evidence/index.json';
assert(fs.existsSync(path.join(root, indexPath)), `Missing evidence index: ${indexPath}`);

const index = readJson(indexPath);
assert(Array.isArray(index.entries), 'Evidence index must contain entries array');

const evidenceIdRegex = /^EVD-COMPANYOS-[A-Z]+-\d{3}$/;
const timestampRegex = /20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z/g;

for (const entry of index.entries) {
  assert(typeof entry.evidenceId === 'string', 'index entry missing evidenceId');
  assert(evidenceIdRegex.test(entry.evidenceId), `Invalid evidenceId format: ${entry.evidenceId}`);

  for (const key of ['report', 'metrics', 'stamp']) {
    assert(typeof entry[key] === 'string', `index entry missing ${key} path`);
    assert(fs.existsSync(path.join(root, entry[key])), `Missing evidence file: ${entry[key]}`);
  }

  const report = readJson(entry.report);
  const metrics = readJson(entry.metrics);
  const stamp = readJson(entry.stamp);

  for (const payload of [report, metrics, stamp]) {
    assert(payload.evidenceId === entry.evidenceId, `Evidence ID mismatch for ${entry.evidenceId}`);
  }

  assert(typeof report.decisionId === 'string', `${entry.evidenceId} report missing decisionId`);
  assert(typeof report.allowed === 'boolean', `${entry.evidenceId} report missing allowed boolean`);
  assert(Array.isArray(report.policyIds), `${entry.evidenceId} report missing policyIds`);
  assert(typeof metrics.allowedCount === 'number', `${entry.evidenceId} metrics missing allowedCount`);
  assert(typeof metrics.deniedCount === 'number', `${entry.evidenceId} metrics missing deniedCount`);
  assert(typeof stamp.generatedAt === 'string', `${entry.evidenceId} stamp missing generatedAt`);

  const reportText = JSON.stringify(report);
  const metricsText = JSON.stringify(metrics);
  if (timestampRegex.test(reportText) || timestampRegex.test(metricsText)) {
    throw new Error(`Timestamp found outside stamp.json for evidence ${entry.evidenceId}`);
  }
}

console.log(`verify-evidence: validated ${index.entries.length} evidence entries`);
