import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const baseRef = process.env.FOCUSED_TEST_BASE ?? 'origin/main';
let diffRange = `${baseRef}...HEAD`;

try {
  execSync(`git rev-parse --verify ${baseRef}`, { stdio: 'ignore' });
} catch {
  diffRange = 'HEAD~1...HEAD';
}

const diffOutput = execSync(`git diff --name-only ${diffRange}`, {
  encoding: 'utf8',
}).trim();

const files = diffOutput
  .split('\n')
  .filter(Boolean)
  .filter((file) => ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(extname(file)));

const focusedPattern = /\.(only|skip)\s*\(/;
const failures = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  if (focusedPattern.test(content)) {
    failures.push(file);
  }
}

if (failures.length > 0) {
  // eslint-disable-next-line no-console
  console.error('Focused tests detected in changed files:\n' + failures.join('\n'));
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log('No focused tests detected in changed files.');
