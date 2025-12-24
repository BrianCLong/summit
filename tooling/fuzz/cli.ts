#!/usr/bin/env ts-node
import fs from 'node:fs';
import path from 'node:path';
import { runFuzzTargets, summarize, FuzzTarget } from './fuzzRunner';

const DEFAULT_ITERATIONS = parseInt(process.env.FUZZ_ITERATIONS ?? '100', 10);
const DEFAULT_SEED = parseInt(process.env.FUZZ_SEED ?? '2025', 10);

function loadSeed(name: string): string {
  const seedPath = path.join(process.cwd(), 'test', 'fuzz', 'seeds', `${name}.txt`);
  return fs.readFileSync(seedPath, 'utf8');
}

async function main() {
  const shortMode = process.env.CI === 'true' || process.env.FUZZ_MODE === 'ci';
  const iterations = shortMode ? Math.min(DEFAULT_ITERATIONS, 25) : DEFAULT_ITERATIONS;

  const targets: FuzzTarget[] = [
    {
      name: 'csv-inference',
      seeds: [loadSeed('csv'), loadSeed('csv-edge')],
      iterations,
      timeoutMs: 35,
      handler: (input) => {
        const rows = input.split(/\r?\n/).map((line) => line.split(','));
        if (rows.some((row) => row.length > 64)) {
          throw new Error('column explosion');
        }
      },
    },
    {
      name: 'jsonl-parser',
      seeds: [loadSeed('jsonl')],
      iterations,
      timeoutMs: 35,
      handler: (input) => {
        const lines = input.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          try {
            JSON.parse(line);
          } catch (error) {
            if (String(error).includes('Unexpected token')) {
              throw error;
            }
          }
        }
      },
    },
    {
      name: 'connector-normalization',
      seeds: [loadSeed('connector')],
      iterations,
      timeoutMs: 35,
      handler: (input) => {
        const trimmed = input.trim();
        if (trimmed.length > 4096) {
          throw new Error('payload too large');
        }
        if (/\bDROP TABLE\b/i.test(trimmed)) {
          throw new Error('sql injection attempt');
        }
      },
    },
    {
      name: 'redaction-engine',
      seeds: [loadSeed('redaction')],
      iterations,
      timeoutMs: 35,
      handler: (input) => {
        if (/secret|password/i.test(input) && input.length > 128) {
          throw new Error('redaction overflow');
        }
      },
    },
  ];

  const results = await runFuzzTargets(targets, DEFAULT_SEED);
  const summary = summarize(results);
  console.log(summary);

  const failures = results.flatMap((result) => result.failures);
  process.exitCode = failures.length > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
