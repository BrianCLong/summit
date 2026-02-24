#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function runNode(args) {
  const result = spawnSync('node', args, { stdio: 'inherit' });
  return result.status ?? 1;
}

const validateStatus = runNode(['packages/graph-sync-validator/bin/graph-sync-validate.mjs']);
if (validateStatus !== 0) {
  process.exit(validateStatus);
}

const reconStatus = runNode([
  'packages/graph-sync-validator/bin/parity-recon.mjs',
  '--metrics',
  'artifacts/graph-sync/metrics.json',
  '--output',
  'artifacts/graph-sync/recon.json',
]);

process.exit(reconStatus);
