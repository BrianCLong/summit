import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compilePolicyFromSource } from '../src/compiler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const [,, policyName] = process.argv;

if (!policyName) {
  console.error('Usage: renderPolicy <policyNameWithoutExtension>');
  process.exitCode = 1;
  process.exit();
}

const policyPath = resolve(__dirname, '..', 'test', 'policies', `${policyName}.srlc`);
const source = readFileSync(policyPath, 'utf-8');
const compiled = compilePolicyFromSource(source);

console.log(JSON.stringify({
  name: compiled.policy.name,
  targets: compiled.targets,
  explain: compiled.explain
}, null, 2));
