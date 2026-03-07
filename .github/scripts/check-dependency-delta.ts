import { execSync } from 'node:child_process';
import process from 'node:process';

const baseRef = process.env.GITHUB_BASE_REF || 'main';

function getDiffRange(): string {
  try {
    execSync(`git fetch origin ${baseRef}`, { stdio: 'ignore' });
    execSync(`git rev-parse --verify origin/${baseRef}`, { stdio: 'ignore' });
    return `origin/${baseRef}...HEAD`;
  } catch {
    return 'HEAD~1...HEAD';
  }
}

const diffRange = getDiffRange();
let changedFiles: string[] = [];

try {
  const diff = execSync(`git diff --name-only ${diffRange}`, {
    encoding: 'utf8',
  }).trim();
  changedFiles = diff.length > 0 ? diff.split('\n') : [];
} catch (error) {
  console.warn(`Dependency delta diff fallback triggered: ${String(error)}`);
  changedFiles = [];
}

const dependencyTouched = changedFiles.some((file) => file.endsWith('package.json'));
const ledgerTouched = changedFiles.includes('docs/governance/dependency-delta.md');

if (dependencyTouched && !ledgerTouched) {
  console.error(
    'Dependency delta ledger missing: update docs/governance/dependency-delta.md when package.json changes.',
  );
  process.exit(1);
}

console.log(`Dependency delta check passed for range ${diffRange}.`);
