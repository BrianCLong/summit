import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Strict Operating Rules Enforcement
const RULES = {
  NO_UNTRACKED: true,
  NO_MODIFIED_LOCKFILE: true,
  NO_TODO_IN_DOCS: false // Warning only
};

const run = (cmd: string): string => {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e: any) {
    console.error(`❌ Execution failed: ${cmd}`);
    console.error(e.message);
    process.exit(1);
  }
};

const fail = (msg: string) => {
  console.error(`❌ HYGIENE CHECK FAILED: ${msg}`);
  process.exit(1);
};

const pass = (msg: string) => {
  console.log(`✅ ${msg}`);
};

const checkGitStatus = () => {
  const status = run('git status --porcelain');
  if (!status) {
    pass('Repo is clean (git status)');
    return;
  }

  const lines = status.split('\n');
  const untracked = lines.filter(l => l.startsWith('??'));
  const modified = lines.filter(l => !l.startsWith('??'));

  if (RULES.NO_UNTRACKED && untracked.length > 0) {
    console.error('Untracked files found:');
    untracked.forEach(f => console.error(`  ${f}`));
    fail('Untracked files are forbidden in strict mode.');
  }

  if (modified.length > 0) {
    // Check if only lockfile is modified?
    const lockfileModified = modified.some(l => l.includes('pnpm-lock.yaml') || l.includes('package-lock.json'));
    if (RULES.NO_MODIFIED_LOCKFILE && lockfileModified) {
       fail('Lockfile is modified. Dependencies must be deterministic.');
    }
    console.warn('⚠️  Modified files detected (warning only for non-lockfiles):');
    modified.forEach(f => console.warn(`  ${f}`));
  }
};

// Check if critical files are present
const checkCriticalFiles = () => {
  const critical = ['package.json', 'pnpm-lock.yaml', 'docs/ga/GA_DEFINITION.md'];
  const missing = critical.filter(f => !fs.existsSync(f));
  if (missing.length > 0) {
    fail(`Missing critical files: ${missing.join(', ')}`);
  }
  pass('Critical files present');
};

const main = () => {
  console.log('🔍 Running Repo Hygiene Check...');
  checkGitStatus();
  checkCriticalFiles();
  console.log('✨ Repo Hygiene Verified.');
};

main();
