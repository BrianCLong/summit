#!/usr/bin/env ts-node
import {
  runContractFuzz,
  DEFAULT_SEED,
  DEFAULT_ITERATIONS,
  DEFAULT_TIMEOUT_MS,
  reportFuzzResults,
} from '../../tooling/fuzz/cli';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const isMain = path.resolve(process.argv[1] ?? '') === __filename;

function resolveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const shortMode = process.env.CI === 'true' || process.env.FUZZ_MODE === 'ci';
  const iterations = resolveNumber(process.env.FUZZ_ITERATIONS, DEFAULT_ITERATIONS);
  const seed = resolveNumber(process.env.FUZZ_SEED, DEFAULT_SEED);
  const timeoutMs = resolveNumber(process.env.FUZZ_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);

  const { results, config } = await runContractFuzz({
    seed,
    iterations,
    timeoutMs,
    shortMode,
  });

  reportFuzzResults(results, config.seed, config.iterations, config.timeoutMs);
  const failures = results.flatMap((result) => result.failures);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
