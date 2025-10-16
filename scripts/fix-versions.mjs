#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const files = execSync(`git ls-files | grep -E '(^|/)package.json$'`, {
  stdio: 'pipe',
})
  .toString()
  .trim()
  .split('\n')
  .filter(Boolean);

const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
let fixed = 0;

for (const f of files) {
  const p = join(root, f);
  const pkg = JSON.parse(readFileSync(p, 'utf8'));
  const v = pkg.version;
  if (!v || typeof v !== 'string' || !SEMVER.test(v)) {
    pkg.version = '0.0.0-private';
    if (pkg.private === undefined) pkg.private = true;
    writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
    fixed++;
  }
}
console.log(`Fixed ${fixed} package.json version field(s).`);
