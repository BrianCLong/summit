import * as fs from 'node:fs';
import * as path from 'node:path';

const REQUIRED_FILES = ['report.json', 'metrics.json', 'stamp.json'];
const TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function containsTimestamp(value) {
  if (typeof value === 'string') {
    return TIMESTAMP_PATTERN.test(value);
  }
  if (Array.isArray(value)) {
    return value.some(containsTimestamp);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some(containsTimestamp);
  }
  return false;
}

const repoRoot = process.cwd();
const evidenceIndexPath = path.join(repoRoot, 'evidence', 'index.json');

if (!fs.existsSync(evidenceIndexPath)) {
  fail('Missing evidence/index.json');
}

const indexJson = readJson(evidenceIndexPath);
if (!indexJson || typeof indexJson !== 'object') {
  fail('Invalid evidence/index.json');
}

const evidenceMap = indexJson.evidence;
if (!evidenceMap || typeof evidenceMap !== 'object') {
  fail('Missing evidence map in evidence/index.json');
}

for (const [evidenceId, relativeDir] of Object.entries(evidenceMap)) {
  const evidenceDir = path.join(repoRoot, relativeDir);
  if (!fs.existsSync(evidenceDir)) {
    fail(`Evidence directory missing for ${evidenceId}: ${relativeDir}`);
  }
  const files = fs.readdirSync(evidenceDir).sort();
  if (files.length !== REQUIRED_FILES.length || !REQUIRED_FILES.every((file) => files.includes(file))) {
    fail(`Evidence directory must contain only ${REQUIRED_FILES.join(', ')} for ${evidenceId}`);
  }

  for (const fileName of REQUIRED_FILES) {
    const filePath = path.join(evidenceDir, fileName);
    if (!fs.existsSync(filePath)) {
      fail(`Missing ${fileName} for ${evidenceId}`);
    }
  }

  const reportPath = path.join(evidenceDir, 'report.json');
  const metricsPath = path.join(evidenceDir, 'metrics.json');
  const stampPath = path.join(evidenceDir, 'stamp.json');

  const reportJson = readJson(reportPath);
  const metricsJson = readJson(metricsPath);
  const stampJson = readJson(stampPath);

  if (containsTimestamp(reportJson)) {
    fail(`report.json must not contain timestamps for ${evidenceId}`);
  }
  if (containsTimestamp(metricsJson)) {
    fail(`metrics.json must not contain timestamps for ${evidenceId}`);
  }
  if (!containsTimestamp(stampJson)) {
    fail(`stamp.json must include a timestamp for ${evidenceId}`);
  }
}

const requiredEvidencePath = path.join(repoRoot, 'docs', 'ga', 'planning-ga-criteria.md');
if (fs.existsSync(requiredEvidencePath)) {
  const content = fs.readFileSync(requiredEvidencePath, 'utf8');
  const matches = content.match(/EVD-[A-Z0-9-]+/g) ?? [];
  const missing = matches.filter((id) => !evidenceMap[id]);
  if (missing.length > 0) {
    fail(`Missing required evidence IDs in evidence/index.json: ${missing.join(', ')}`);
  }
}

console.log('evidence: OK');
