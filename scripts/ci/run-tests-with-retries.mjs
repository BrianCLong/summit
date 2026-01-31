#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const quarantinePath = 'scripts/ci/flake-quarantine.json';
let quarantine = { testNamePattern: '', retries: 0 };

if (fs.existsSync(quarantinePath)) {
  try {
    quarantine = JSON.parse(fs.readFileSync(quarantinePath, 'utf8'));
  } catch (e) {
    console.error('Failed to parse quarantine file:', e);
  }
}

const args = process.argv.slice(2);
// Use default reporters if none provided
const base = args.some(arg => arg.includes('--reporter')) ? [] : ['--reporters=default', '--reporters=jest-junit'];

function run(cmd, a) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${cmd} ${a.join(' ')}`);
    const proc = spawn(cmd, a, { stdio: 'inherit', shell: true });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });
  });
}

async function main() {
  // Respect existing pnpm filters if provided, otherwise default to recursive
  const hasFilter = args.includes('-F') || args.includes('--filter');
  const pnpmArgs = hasFilter ? [] : ['-r'];

  try {
    // Primary Run
    await run('pnpm', [...pnpmArgs, 'test', ...args]);
  } catch (err) {
    if (quarantine.retries > 0) {
      console.log(`\n⚠️ Tests failed. Retrying (1/${quarantine.retries})...\n`);
      try {
        // Simple retry of the whole command to avoid masking failures
        await run('pnpm', [...pnpmArgs, 'test', ...args]);
        console.log('\n✅ Tests passed on retry.\n');
      } catch (retryErr) {
        console.error('\n❌ Tests failed after retry.\n');
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

main();
