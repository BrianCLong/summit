#!/usr/bin/env ts-node
/**
 * Securiteyes IG Mode CLI
 * - Angleton = investigative/advisory
 * - Dzerzhinsky = strict containment/enforcing
 *
 * Writes `.securiteyes/mode.json` so CI/workflows can tighten or relax gates.
 * Also merges mode settings into `policy-input.json` when present.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

type Mode = 'angleton' | 'dzerzhinsky';

const mode = (process.argv[2] || '').toLowerCase() as Mode;

if (!['angleton', 'dzerzhinsky'].includes(mode)) {
  console.error('Usage: securiteyes-mode <angleton|dzerzhinsky>');
  process.exit(2);
}

const outDir = '.securiteyes';
if (!existsSync(outDir)) {
  mkdirSync(outDir);
}

const ANGLETON = {
  mode: 'angleton',
  thresholds: {
    unit_coverage_min: 92,
    allow_secrets_leaks: 0,
    require_provenance: true,
  },
  enforcement: {
    advisory_only: true,
    block_merge_when_gate_fails: false,
  },
};

const DZERZHINSKY = {
  mode: 'dzerzhinsky',
  thresholds: {
    unit_coverage_min: 97,
    allow_secrets_leaks: 0,
    require_provenance: true,
  },
  enforcement: {
    advisory_only: false,
    block_merge_when_gate_fails: true,
  },
};

const config = mode === 'angleton' ? ANGLETON : DZERZHINSKY;
writeFileSync(path.join(outDir, 'mode.json'), JSON.stringify(config, null, 2));

try {
  const inputPath = path.join('.', 'policy-input.json');
  let input: Record<string, unknown> = { pr: { tests: { unit: 0, critical_e2e_pass: false } } };
  if (existsSync(inputPath)) {
    input = JSON.parse(readFileSync(inputPath, 'utf-8')) as Record<string, unknown>;
  }
  (input as any)._securiteyes = config;
  writeFileSync(inputPath, JSON.stringify(input, null, 2));
} catch (error) {
  console.warn('[securiteyes-mode] failed to patch policy-input.json:', (error as Error).message);
}

console.log(`Securiteyes IG mode set to ${mode.toUpperCase()}`);
