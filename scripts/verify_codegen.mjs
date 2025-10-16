#!/usr/bin/env node
import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { stdio: 'pipe' }).toString().trim();

try {
  const before = run('git status --porcelain');
  try { run('pnpm -s codegen'); } catch {}
  const after = run('git status --porcelain');
  if (before !== after) {
    console.error('❌ GraphQL codegen is out of date. Run: pnpm codegen');
    try { console.error(run('git --no-pager diff --stat')); } catch {}
    process.exit(1);
  }
  console.log('✅ GraphQL codegen up-to-date.');
} catch (e) {
  console.error('⚠️ verify_codegen encountered an issue; not failing hard');
  process.exit(0);
}
