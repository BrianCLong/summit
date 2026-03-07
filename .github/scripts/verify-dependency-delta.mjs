import { execSync } from 'node:child_process';
import fs from 'node:fs';

const baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'HEAD~1';

function changedFiles() {
  try {
    const out = execSync(`git diff --name-only ${baseRef}...HEAD`, { encoding: 'utf8' });
    return out.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    const out = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' });
    return out.split('\n').map((line) => line.trim()).filter(Boolean);
  }
}

const files = changedFiles();
const dependencyTouched = files.includes('package.json') || files.includes('pnpm-lock.yaml');

if (!dependencyTouched) {
  console.log('verify-dependency-delta: package manifests unchanged');
  process.exit(0);
}

const ledgerPath = 'docs/security/dependency-delta.md';
if (!fs.existsSync(ledgerPath)) {
  throw new Error(`Dependency manifests changed but ${ledgerPath} is missing`);
}

const content = fs.readFileSync(ledgerPath, 'utf8').trim();
if (content.split('\n').length < 5) {
  throw new Error(`Dependency manifests changed but ${ledgerPath} was not updated with meaningful content`);
}

console.log('verify-dependency-delta: dependency ledger present for manifest changes');
