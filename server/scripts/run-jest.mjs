import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jestBin = path.join(__dirname, '..', '..', 'node_modules', 'jest', 'bin', 'jest.js');

const baseArgs = [
  '--config',
  'jest.config.ts',
  // NOTE: testPathIgnorePatterns is defined in jest.config.ts with comprehensive
  // exclusions for ESM/CJS incompatible tests. Do not override here.
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
