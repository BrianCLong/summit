#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { verifyDAG } from './index.js';
import type { Fixtures, Manifest, VerificationResult } from './types.js';

interface CliArgs {
  manifestPath: string;
  fixturesPath: string;
  reportPath?: string;
  failureLogPath?: string;
  toleranceMultiplier?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { manifestPath: '', fixturesPath: '' };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    switch (current) {
      case '--manifest':
        args.manifestPath = argv[++index] ?? '';
        break;
      case '--fixtures':
        args.fixturesPath = argv[++index] ?? '';
        break;
      case '--report':
        args.reportPath = argv[++index];
        break;
      case '--failure-log':
        args.failureLogPath = argv[++index];
        break;
      case '--tolerance-multiplier':
        args.toleranceMultiplier = Number(argv[++index]);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        if (current.startsWith('--')) {
          throw new Error(`Unknown option ${current}`);
        }
        break;
    }
  }

  if (!args.manifestPath) {
    throw new Error('Missing required --manifest option');
  }

  if (!args.fixturesPath) {
    throw new Error('Missing required --fixtures option');
  }

  if (
    args.toleranceMultiplier !== undefined &&
    (Number.isNaN(args.toleranceMultiplier) || args.toleranceMultiplier <= 0)
  ) {
    throw new Error('--tolerance-multiplier must be a positive number');
  }

  return args;
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`pca-verify - Proof-Carrying Analytics verifier\n\n` +
    `Usage: pca-verify --manifest <path> --fixtures <path> [--report <path>] [--failure-log <path>]`);
}

async function loadJson<T>(path: string): Promise<T> {
  const content = await readFile(resolve(path), 'utf8');
  return JSON.parse(content) as T;
}

async function writeJson(path: string, payload: unknown): Promise<void> {
  await writeFile(resolve(path), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function run(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    const manifest = await loadJson<Manifest>(args.manifestPath);
    const fixtures = await loadJson<Fixtures>(args.fixturesPath);

    const result = verifyDAG(manifest, fixtures, {
      toleranceMultiplier: args.toleranceMultiplier
    });

    reportToConsole(result);

    if (args.reportPath) {
      await writeJson(args.reportPath, result);
    }

    if (result.verdict !== 'match') {
      const failurePath = args.failureLogPath ?? 'pca-verify.failures.log';
      await writeJson(failurePath, {
        manifest: args.manifestPath,
        fixtures: args.fixturesPath,
        failureLog: result.failureLog,
        checksumFailures: result.checksumFailures,
        variances: result.variances
      });
    }

    process.exit(result.verdict === 'match' ? 0 : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`Verification failed: ${message}`);
    process.exit(1);
  }
}

function reportToConsole(result: VerificationResult): void {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        verdict: result.verdict,
        signatureValid: result.signatureValid,
        evaluatedNodes: result.evaluatedNodes,
        variances: result.variances.map((variance) => ({
          nodeId: variance.nodeId,
          withinTolerance: variance.withinTolerance,
          tolerance: variance.tolerance
        }))
      },
      null,
      2
    )
  );
}

run();
