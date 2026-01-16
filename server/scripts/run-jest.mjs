import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jestBin = require.resolve('jest/bin/jest');

const baseArgs = [
  '--config',
  'jest.config.ts',
  '--testPathIgnorePatterns=integration|/src/tests/|\\.e2e\\.',
  '--passWithNoTests',
];

const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const jestArgs = [...baseArgs, ...forwardedArgs];

// Ensure ESM support is enabled for Jest
const nodeOptions = process.env.NODE_OPTIONS || '';
const esmFlag = '--experimental-vm-modules';
const updatedNodeOptions = nodeOptions.includes(esmFlag)
  ? nodeOptions
  : `${nodeOptions} ${esmFlag}`.trim();

const result = spawnSync(process.execPath, [jestBin, ...jestArgs], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: updatedNodeOptions },
});
process.exit(result.status ?? 0);
