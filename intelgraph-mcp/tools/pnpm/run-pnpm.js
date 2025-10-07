#!/usr/bin/env node
/**
 * Offline-friendly pnpm launcher.
 *
 * Resolution order:
 * 1. PNPM_BIN env var
 * 2. vendored ./tools/pnpm/pnpm-9.6.0.cjs
 * 3. system pnpm on PATH
 */

const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const __dirname = __dirname_self();

const envBin = process.env.PNPM_BIN;
const vendored = resolve(__dirname, 'pnpm-9.6.0.cjs');

let bin = envBin;
if (!bin) {
  if (existsSync(vendored)) {
    bin = vendored;
  } else {
    try {
      bin = require.resolve('pnpm');
    } catch (err) {
      bin = 'pnpm';
    }
  }
}

const args = process.argv.slice(2);

const child = spawn(process.execPath, [bin, ...args], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => process.exit(code ?? 0));

function __dirname_self() {
  return require('node:path').dirname(__filename);
}
