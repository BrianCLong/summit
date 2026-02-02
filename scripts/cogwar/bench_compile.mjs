#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const distDir = path.join(repoRoot, 'dist', 'cogwar');

function runCompile() {
  const start = performance.now();
  const result = spawnSync('node', ['scripts/cogwar/compile_packs.mjs'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  const end = performance.now();
  if (result.status !== 0) {
    throw new Error('compile_packs failed');
  }
  return Math.round(end - start);
}

function writeBench(durationMs) {
  fs.mkdirSync(distDir, { recursive: true });
  const bench = {
    compile_ms: durationMs,
  };
  fs.writeFileSync(
    path.join(distDir, 'bench.json'),
    JSON.stringify(bench, null, 2) + '\n'
  );
}

function main() {
  const durationMs = runCompile();
  writeBench(durationMs);
}

main();
