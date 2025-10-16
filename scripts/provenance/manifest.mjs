#!/usr/bin/env node
import { execSync } from 'node:child_process';

const run = (command) => {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch (error) {
    return undefined;
  }
};

const manifest = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  git: {
    commit: run('git rev-parse HEAD'),
    tree: run('git rev-parse HEAD^{tree}'),
    describe: run('git describe --tags --always'),
  },
  build: {
    node: process.version,
    pnpm: run('pnpm --version'),
    workflowRun: process.env.GITHUB_RUN_ID || null,
    actor: process.env.GITHUB_ACTOR || null,
    repository:
      process.env.GITHUB_REPOSITORY ||
      run('git config --get remote.origin.url'),
  },
};

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
