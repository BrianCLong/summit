#!/usr/bin/env node
import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const inputPath = resolve('policies/tests/quality_gates_input.json');
const policyPath = resolve('policies/quality_gates.rego');
const outputPath = resolve('policies/tests/quality_gates_output.json');

const result = spawnSync('opa', ['eval', '-f', 'json', '-i', inputPath, '-d', policyPath, 'data.quality.gates'], {
  encoding: 'utf-8'
});

if (result.error) {
  console.error('Failed to execute opa:', result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

let parsed;
try {
  parsed = JSON.parse(result.stdout);
} catch (error) {
  console.error('Unable to parse OPA output:', error.message);
  process.exit(1);
}

const expression = parsed?.result?.[0]?.expressions?.[0];
const value = expression?.value ?? {};
const denySet = value?.deny_reasons ?? [];

const denyReasons = Array.isArray(denySet)
  ? denySet
  : Object.keys(denySet || {});

const summary = {
  timestamp: new Date().toISOString(),
  input: inputPath,
  policy: policyPath,
  allow: Boolean(value.allow),
  denyReasons
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(summary, null, 2));

if (!summary.allow) {
  console.error('Quality gates policy failed:', summary);
  process.exit(2);
}
