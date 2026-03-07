#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['--test', 'tests/agents/inference/spec/off_by_default.test.mjs'],
  {
    stdio: 'inherit',
    env: process.env,
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
