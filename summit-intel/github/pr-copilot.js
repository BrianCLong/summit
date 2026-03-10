#!/usr/bin/env node
import { execSync } from 'node:child_process';

const baseRef = process.env.SUMMIT_INTEL_BASE_REF ?? 'origin/main';
const diffOutput = execSync(`git diff --numstat ${baseRef}`, { stdio: ['ignore', 'pipe', 'pipe'] })
  .toString()
  .trim();

const files = diffOutput ? diffOutput.split('\n') : [];
let changedLines = 0;

for (const file of files) {
  const [added, removed] = file.split('\t');
  changedLines += Number(added) + Number(removed);
}

const risk = changedLines > 500 ? 'HIGH' : changedLines > 200 ? 'MEDIUM' : 'LOW';

console.log('⚠️ Summit Architecture Copilot');
console.log(`Base ref: ${baseRef}`);
console.log(`Changed files: ${files.length}`);
console.log(`Lines changed: ${changedLines}`);
console.log(`Architecture Risk: ${risk}`);
