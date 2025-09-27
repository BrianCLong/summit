#!/usr/bin/env node
import process from 'node:process';
import path from 'node:path';
import { compileContract, hasBreakingChanges, regenerateGoldenSamples, runDiff } from './index';

function printHelp(): void {
  console.log(`contract-gate <command> [options]

Commands:
  compile --contract <path> --out <dir> [--baseline <path>] [--report <path>] [--regen]
  diff --base <path> --target <path> [--report <path>]
  regen-samples --contract <path> --out <dir>
`);
}

interface ArgMap {
  _: string[];
  [key: string]: string | string[] | boolean | undefined;
}

function parseArgs(argv: string[]): ArgMap {
  const args: ArgMap = { _: [] };
  let currentKey: string | null = null;
  for (const token of argv) {
    if (token.startsWith('--')) {
      currentKey = token.slice(2);
      args[currentKey] = true;
    } else if (currentKey) {
      const previous = args[currentKey];
      if (previous === true) {
        args[currentKey] = token;
      } else if (Array.isArray(previous)) {
        previous.push(token);
      } else if (typeof previous === 'string') {
        args[currentKey] = [previous, token];
      } else {
        args[currentKey] = token;
      }
      currentKey = null;
    } else {
      args._.push(token);
    }
  }
  return args;
}

async function handleCompile(args: ArgMap): Promise<void> {
  const contractPath = args.contract as string | undefined;
  const outputDir = args.out as string | undefined;
  if (!contractPath || !outputDir) {
    throw new Error('compile requires --contract and --out');
  }
  const baselinePath = args.baseline as string | undefined;
  const reportPath = args.report as string | undefined;
  const regenerateSamples = Boolean(args.regen);
  const artifacts = await compileContract({
    contractPath,
    outputDir,
    baselinePath,
    reportPath,
    regenerateSamples,
  });
  console.log(JSON.stringify(artifacts, null, 2));
  if (artifacts.violations.length > 0) {
    console.log(`Detected ${artifacts.violations.length} contract change(s).`);
  }
  if (hasBreakingChanges(artifacts.violations)) {
    process.exitCode = 1;
  }
}

async function handleDiff(args: ArgMap): Promise<void> {
  const base = args.base as string | undefined;
  const target = args.target as string | undefined;
  if (!base || !target) {
    throw new Error('diff requires --base and --target');
  }
  const report = args.report as string | undefined;
  const diffs = await runDiff({ base, target, report });
  console.log(JSON.stringify(diffs, null, 2));
  if (hasBreakingChanges(diffs)) {
    process.exitCode = 1;
  }
}

async function handleRegen(args: ArgMap): Promise<void> {
  const contractPath = args.contract as string | undefined;
  const outputDir = args.out as string | undefined;
  if (!contractPath || !outputDir) {
    throw new Error('regen-samples requires --contract and --out');
  }
  const location = await regenerateGoldenSamples({ contractPath, outputDir });
  console.log(`Golden samples written to ${path.resolve(location)}`);
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const [command] = args._;
  try {
    switch (command) {
      case 'compile':
        await handleCompile(args);
        break;
      case 'diff':
        await handleDiff(args);
        break;
      case 'regen-samples':
        await handleRegen(args);
        break;
      case 'help':
      case undefined:
        printHelp();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('contract-gate/cli.ts')) {
  main();
}
