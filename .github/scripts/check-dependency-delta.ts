import { execSync } from 'node:child_process';
import process from 'node:process';

const baseRef = process.env.GITHUB_BASE_REF || 'main';

try {
  execSync(`git fetch origin ${baseRef}`, { stdio: 'ignore' });
} catch (error) {
  console.warn(`Unable to fetch origin/${baseRef}: ${String(error)}`);
}

const diff = execSync(`git diff --name-only origin/${baseRef}...HEAD`, {
  encoding: 'utf8',
}).trim();

const changedFiles = diff.length > 0 ? diff.split('\n') : [];
const dependencyTouched = changedFiles.some((file) => file.endsWith('package.json'));
const ledgerTouched = changedFiles.includes('docs/governance/dependency-delta.md');

if (dependencyTouched && !ledgerTouched) {
  console.error(
    'Dependency delta ledger missing: update docs/governance/dependency-delta.md when package.json changes.',
  );
  process.exit(1);
}

console.log('Dependency delta check passed.');
