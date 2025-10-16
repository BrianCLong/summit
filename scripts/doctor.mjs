#!/usr/bin/env node
import { execSync } from 'node:child_process';
const run = (c) => execSync(c, { stdio: 'pipe' }).toString().trim();
const step = (name, cmd) => {
  try {
    run(cmd);
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(
      `❌ ${name}\n${e.stdout?.toString?.() || ''}${e.stderr?.toString?.() || e}`,
    );
    process.exit(1);
  }
};

console.log('🔎 IntelGraph Doctor');
step('eslint', 'pnpm -s lint');
step('typecheck', 'pnpm -s typecheck');
step('codegen drift', 'node scripts/verify_codegen.mjs');
step('madge (cycles)', 'pnpm -s madge');
console.log('🎉 All green');
