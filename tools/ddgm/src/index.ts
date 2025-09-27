#!/usr/bin/env node
import fs from 'fs';
import process from 'process';
import { readDatasetDiff, readPlanYaml, writePlanYaml, writeSimulationSnapshot } from './io.js';
import { buildGovernanceActions, generateGovernancePlan } from './plan.js';
import { simulateImpact } from './simulator.js';
import { verifyPlanSignature } from './signature.js';

interface ParsedArgs {
  command: string;
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) {
    return { command: 'help', flags: {} };
  }

  const [command, ...rest] = argv;
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = rest[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = true;
    }
  }

  return { command, flags };
}

function assertFlag(flags: Record<string, string | boolean>, name: string): string {
  const value = flags[name];
  if (!value || typeof value !== 'string') {
    throw new Error(`Missing required flag --${name}`);
  }
  return value;
}

function printHelp() {
  console.log(`ddgm - Data-Diff Governance Mapper\n\nCommands:\n  plan --diff <path> --out <plan.yaml> --signing-key <path> [--public-key <path>] [--key-id <id>] [--simulation-out <path>]\n  simulate --diff <path> [--plan <plan.yaml>] [--out <simulation.json>]\n  verify --plan <path> --public-key <path>\n`);
}

function handlePlan(flags: Record<string, string | boolean>) {
  const diffPath = assertFlag(flags, 'diff');
  const outputPath = assertFlag(flags, 'out');
  const signingKeyPath = assertFlag(flags, 'signing-key');

  const diff = readDatasetDiff(diffPath);
  const signingKeyPem = fs.readFileSync(signingKeyPath, 'utf8');
  const publicKeyPem = typeof flags['public-key'] === 'string' ? fs.readFileSync(flags['public-key'] as string, 'utf8') : undefined;
  const signingKeyId = typeof flags['key-id'] === 'string' ? (flags['key-id'] as string) : 'ddgm-default';
  const deterministicSeed = typeof flags['seed'] === 'string' ? (flags['seed'] as string) : undefined;

  const plan = generateGovernancePlan(diff, {
    signingKeyPem,
    publicKeyPem,
    signingKeyId,
    deterministicSeed
  });

  const planYaml = writePlanYaml(plan, outputPath);
  const simulationOut = typeof flags['simulation-out'] === 'string' ? (flags['simulation-out'] as string) : undefined;
  if (simulationOut) {
    writeSimulationSnapshot(plan.impactForecast, simulationOut);
  }

  if (!simulationOut) {
    console.log(planYaml);
  }
}

function handleSimulate(flags: Record<string, string | boolean>) {
  const diffPath = assertFlag(flags, 'diff');
  const diff = readDatasetDiff(diffPath);
  let actions;
  if (typeof flags.plan === 'string') {
    const plan = readPlanYaml(flags.plan as string);
    actions = plan.governanceActions;
  } else {
    actions = buildGovernanceActions(diff);
  }

  const projection = simulateImpact(diff, actions);
  const outputPath = typeof flags.out === 'string' ? (flags.out as string) : undefined;
  const serialized = writeSimulationSnapshot(projection, outputPath);
  if (!outputPath) {
    console.log(serialized);
  }
}

function handleVerify(flags: Record<string, string | boolean>) {
  const planPath = assertFlag(flags, 'plan');
  const publicKeyPath = assertFlag(flags, 'public-key');
  const plan = readPlanYaml(planPath);
  const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');
  const ok = verifyPlanSignature(plan, publicKeyPem);
  if (!ok) {
    throw new Error('Signature verification failed.');
  }
  console.log('Signature verified.');
}

async function run() {
  try {
    const [, , ...argv] = process.argv;
    const { command, flags } = parseArgs(argv);

    switch (command) {
      case 'plan':
        handlePlan(flags);
        break;
      case 'simulate':
        handleSimulate(flags);
        break;
      case 'verify':
        handleVerify(flags);
        break;
      default:
        printHelp();
        break;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

run();
