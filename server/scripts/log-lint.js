#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const searchArgs = ['--no-heading', '--line-number', 'console\\.log', 'src'];
const result = spawnSync('rg', searchArgs, {
  cwd: repoRoot,
  encoding: 'utf-8',
});

if (result.error) {
  console.warn('[log-lint] ripgrep not found; skipping console.log scan.');
  process.exit(0);
}

if (result.stdout.trim().length === 0) {
  console.log('[log-lint] OK: no console.log usage detected in server/src.');
  process.exit(0);
}

console.warn('[log-lint] Warning: console.log usages found in server/src.');
console.warn(result.stdout.trim());
process.exit(0);
