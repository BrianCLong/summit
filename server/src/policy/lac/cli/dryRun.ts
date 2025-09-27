#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { compilePolicy, simulate, type SimulationContext } from '../index.js';

interface CliArgs {
  policy: string;
  operation: 'query' | 'mutation' | 'subscription';
  name: string;
  licenses: string[];
  warrants: string[];
  jurisdiction?: string;
  retention?: number | null;
  json: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith('--')) {
      continue;
    }
    if (raw.includes('=')) {
      const [flag, value = ''] = raw.split('=');
      args[flag.replace(/^--/, '')] = value;
      continue;
    }
    const key = raw.replace(/^--/, '');
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  const policyPath = args.policy ? String(args.policy) : undefined;
  if (!policyPath) {
    throw new Error('Missing required --policy path');
  }
  const operation = (args.operation ? String(args.operation) : 'query') as CliArgs['operation'];
  const name = args.name ? String(args.name) : 'anonymous';
  const licenses = args.licenses ? String(args.licenses).split(',').map(v => v.trim()).filter(Boolean) : [];
  const warrants = args.warrants ? String(args.warrants).split(',').map(v => v.trim()).filter(Boolean) : [];
  const jurisdiction = args.jurisdiction ? String(args.jurisdiction) : undefined;
  const retention = args.retention != null ? Number(args.retention) : null;
  const json = Boolean(args.json);
  return {
    policy: policyPath,
    operation,
    name,
    licenses,
    warrants,
    jurisdiction,
    retention: Number.isNaN(retention ?? undefined) ? null : retention,
    json,
  };
}

function printHumanReadable(result: ReturnType<typeof simulate>) {
  console.log('LAC Dry Run Result');
  console.log('==================');
  console.log(`Status      : ${result.status.toUpperCase()}`);
  console.log(`Legal Basis : ${result.legalBasis ?? 'N/A'}`);
  if (result.ruleId) {
    console.log(`Rule        : ${result.ruleId}`);
  }
  if (result.reasons.length > 0) {
    console.log('Reasons:');
    for (const reason of result.reasons) {
      console.log(`  - ${reason}`);
    }
  }
  if (result.diff.length > 0) {
    console.log('Diff Simulation:');
    for (const entry of result.diff) {
      console.log(`  * [${entry.element}] ${entry.change} (${entry.impact})`);
      if (entry.details) {
        console.log(`      ${entry.details}`);
      }
    }
  }
  if (result.appealHint) {
    console.log(`Appeal Hint : ${result.appealHint}`);
  }
}

function run() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.length === 0) {
    console.log(`Usage: lac-dry-run --policy policy.yaml --operation query --name getUser \
  [--licenses lic1,lic2] [--warrants warrant1] [--jurisdiction US] [--retention 7] [--json]`);
    process.exit(0);
  }
  try {
    const args = parseArgs(argv);
    const resolvedPath = path.resolve(process.cwd(), args.policy);
    const contents = fs.readFileSync(resolvedPath, 'utf8');
    const { program } = compilePolicy(contents);
    const context: SimulationContext = {
      operationName: args.name,
      operationType: args.operation,
      licenses: args.licenses,
      warrants: args.warrants,
      jurisdiction: args.jurisdiction,
      retentionDays: args.retention,
    };
    const result = simulate(program, context);
    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printHumanReadable(result);
    }
    process.exit(result.status === 'block' ? 1 : 0);
  } catch (error) {
    console.error('Failed to execute dry-run simulator:', (error as Error).message);
    process.exit(2);
  }
}

run();
