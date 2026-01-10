#!/usr/bin/env ts-node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFuzzTargets, summarize, FuzzResult, FuzzTarget } from './fuzzRunner';

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const DEFAULT_ITERATIONS = parseNumber(process.env.FUZZ_ITERATIONS, 100);
export const MAX_ITERATIONS = parseNumber(process.env.FUZZ_MAX_ITERATIONS, 120);
export const CI_ITERATION_CAP = parseNumber(process.env.FUZZ_CI_ITERATIONS, 25);
export const DEFAULT_SEED = parseNumber(process.env.FUZZ_SEED, 2025);
export const DEFAULT_TIMEOUT_MS = parseNumber(process.env.FUZZ_TIMEOUT_MS, 35);
const __filename = fileURLToPath(import.meta.url);

function clampIterations(value: number, shortMode: boolean): number {
  const bounded = Math.max(1, Math.min(value, MAX_ITERATIONS));
  return shortMode ? Math.min(bounded, CI_ITERATION_CAP) : bounded;
}

export function loadSeed(name: string): string {
  const seedPath = path.join(process.cwd(), 'test', 'fuzz', 'seeds', `${name}.txt`);
  return fs.readFileSync(seedPath, 'utf8');
}

export function buildContractFuzzTargets(iterations: number, timeoutMs: number): FuzzTarget[] {
  return [
    {
      name: 'csv-inference',
      seeds: [loadSeed('csv'), loadSeed('csv-edge')],
      iterations,
      timeoutMs,
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
      timeoutMs,
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
      timeoutMs,
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
      timeoutMs,
      handler: (input) => {
        if (/secret|password/i.test(input) && input.length > 128) {
          throw new Error('redaction overflow');
        }
      },
    },
  ];
}

export async function runContractFuzz(options: {
  seed?: number;
  iterations?: number;
  timeoutMs?: number;
  shortMode?: boolean;
}) {
  const {
    seed = DEFAULT_SEED,
    iterations = DEFAULT_ITERATIONS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    shortMode = false,
  } = options;

  const boundedIterations = clampIterations(iterations, shortMode);
  const targets = buildContractFuzzTargets(boundedIterations, timeoutMs);
  const results = await runFuzzTargets(targets, seed);

  return {
    results,
    config: {
      seed,
      iterations: boundedIterations,
      timeoutMs,
    },
  };
}

function buildReproCommand(seed: number, iterations: number, timeoutMs: number): string {
  return `FUZZ_SEED=${seed} FUZZ_ITERATIONS=${iterations} FUZZ_TIMEOUT_MS=${timeoutMs} pnpm verify:fuzz-contracts`;
}

export function reportFuzzResults(
  results: FuzzResult[],
  seed: number,
  iterations: number,
  timeoutMs: number,
): void {
  console.log(
    `Running API fuzz contracts with seed=${seed}, iterations=${iterations} per target, timeout=${timeoutMs}ms`,
  );
  console.log(summarize(results));

  const failures = results.flatMap((result) => result.failures);
  if (failures.length === 0) {
    console.log('✅ Fuzz contracts satisfied.');
    console.log(`Re-run locally: ${buildReproCommand(seed, iterations, timeoutMs)}`);
    return;
  }

  console.error('\n❌ Fuzz contract failures detected:');
  failures.slice(0, 5).forEach((failure) => {
    console.error(
      `  - ${failure.error} @ iteration ${failure.iteration} (artifact: ${failure.artifactPath})`,
    );
    if (failure.inputSample) {
      console.error(`    sample: ${failure.inputSample}`);
    }
  });
  console.error(`\nRe-run locally: ${buildReproCommand(seed, iterations, timeoutMs)}`);
}

async function main() {
  const shortMode = process.env.CI === 'true' || process.env.FUZZ_MODE === 'ci';
  const iterations = parseNumber(process.env.FUZZ_ITERATIONS, DEFAULT_ITERATIONS);
  const seed = parseNumber(process.env.FUZZ_SEED, DEFAULT_SEED);
  const timeoutMs = parseNumber(process.env.FUZZ_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);

  const { results, config } = await runContractFuzz({
    seed,
    iterations,
    timeoutMs,
    shortMode,
  });

  reportFuzzResults(results, config.seed, config.iterations, config.timeoutMs);
  process.exitCode = results.some((result) => result.failures.length > 0) ? 1 : 0;
}

const isMain = path.resolve(process.argv[1] ?? '') === __filename;

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
