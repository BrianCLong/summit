#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const manifestPath = resolve(process.cwd(), 'workspaces/workspace-manifest.json');
const args = process.argv.slice(2);
const [task, workspace = 'all', ...extraTurboArgs] = args;

function printUsage(workspaces) {
  const workspaceList = Object.keys(workspaces).join(', ');
  console.log('Usage: node scripts/workspaces/run.js <task> [workspace] [-- <extra turbo args>]');
  console.log('Example: node scripts/workspaces/run.js build frontend -- --no-cache');
  console.log(`Available workspaces: ${workspaceList}`);
}

if (!task || task === '--help' || task === '-h') {
  const workspaces = JSON.parse(readFileSync(manifestPath, 'utf8')).workspaces;
  printUsage(workspaces);
  process.exit(task ? 0 : 1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const availableWorkspaces = manifest.workspaces || {};

if (workspace !== 'all' && !availableWorkspaces[workspace]) {
  console.error(`Unknown workspace '${workspace}'.`);
  printUsage(availableWorkspaces);
  process.exit(1);
}

const selectedWorkspaces = workspace === 'all' ? Object.values(availableWorkspaces) : [availableWorkspaces[workspace]];
const filters = Array.from(
  new Set(
    selectedWorkspaces.flatMap((ws) => ws.packages).map((pkg) => `--filter=${pkg}...`)
  )
);

if (filters.length === 0) {
  console.error('No packages found for the selected workspace. Check workspaces/workspace-manifest.json.');
  process.exit(1);
}

const turboArgs = ['turbo', 'run', task, ...filters, ...extraTurboArgs];
const result = spawnSync('npx', turboArgs, {
  stdio: 'inherit',
  env: { ...process.env, TURBO_TELEMETRY_DISABLED: '1' }
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
