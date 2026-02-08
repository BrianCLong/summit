import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ART_DIR = process.env.OSINT_ARTIFACT_DIR || 'artifacts/osint';
const required = ['report.json', 'metrics.json', 'stamp.json', 'evidence/index.json'];
const dependencyDeltaFiles = new Set([
  'dependency-delta.md',
  'DEPENDENCY_DELTA.md',
  'deps_delta.md',
  'deps.delta.md',
]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function exists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getChangedFiles() {
  try {
    const output = execSync('git show --name-only --pretty="" HEAD', {
      encoding: 'utf8',
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.warn('Unable to determine changed files for dependency delta gate.');
    return [];
  }
}

if (!fs.existsSync(ART_DIR)) {
  console.log(`No ${ART_DIR} directory; skipping (expected for most PRs).`);
  process.exit(0);
}

for (const rel of required) {
  const filePath = path.join(ART_DIR, rel);
  if (!exists(filePath)) fail(`Missing required OSINT artifact: ${filePath}`);
}

const reportPath = path.join(ART_DIR, 'report.json');
const report = readJson(reportPath);
if (!report || typeof report !== 'object') fail('report.json must be an object');
if (!report.playbookId) fail('report.json missing playbookId');
if (!Array.isArray(report.findings)) fail('report.json findings must be array');

const findingIds = new Set();
for (const finding of report.findings) {
  if (!finding || typeof finding !== 'object') fail('Each finding must be an object');
  if (!finding.id) fail('Each finding must include id');
  findingIds.add(finding.id);
  if (!finding.provenance || typeof finding.provenance !== 'object') {
    fail('Each finding must include provenance');
  }
  const provenance = finding.provenance;
  const requiredFields = ['sourceName', 'collector', 'requestId', 'collectedAt'];
  for (const field of requiredFields) {
    if (!provenance[field]) fail(`Finding provenance missing ${field}`);
  }
}

if (Array.isArray(report.claims)) {
  for (const claim of report.claims) {
    if (!claim || typeof claim !== 'object') fail('Each claim must be an object');
    if (!Array.isArray(claim.findingIds) || claim.findingIds.length === 0) {
      fail('Each claim must include findingIds');
    }
    for (const findingId of claim.findingIds) {
      if (!findingIds.has(findingId)) {
        fail(`Claim references unknown finding id: ${findingId}`);
      }
    }
    if (!claim.verification || !claim.verification.status) {
      fail('Each claim must include verification status');
    }
    if (claim.verification.status === 'corroborated') {
      const sources = Array.isArray(claim.verification.corroboratingSources)
        ? claim.verification.corroboratingSources
        : [];
      const uniqueSources = new Set(sources);
      if (uniqueSources.size < 2) {
        fail('Corroborated claims must cite at least two independent sources');
      }
    }
  }
}

const changedFiles = getChangedFiles();
if (changedFiles.includes('pnpm-lock.yaml')) {
  const hasDependencyDelta = changedFiles.some((file) =>
    dependencyDeltaFiles.has(file),
  );
  if (!hasDependencyDelta) {
    fail('pnpm-lock.yaml changed without a dependency delta document update');
  }
}

console.log('OSINT artifact gate passed.');
