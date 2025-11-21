#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

interface MetricConfig {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  epsilon: number;
  delta?: number;
  group_size?: number;
  priority: 'critical' | 'nice-to-have';
}

interface SchedulerInput {
  start_date: string;
  end_date: string;
  epsilon_cap: number;
  delta_cap: number;
  metrics: MetricConfig[];
}

interface ReleaseProof {
  cumulative_epsilon: number;
  epsilon_remaining: number;
  advanced_epsilon: number;
  advanced_epsilon_remaining: number;
  delta_spent: number;
  delta_remaining: number;
}

interface ScheduledRelease {
  metric_id: string;
  metric_name: string;
  date: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  priority: 'critical' | 'nice-to-have';
  epsilon_cost: number;
  delta_cost: number;
  group_size: number;
  proof: ReleaseProof;
}

interface SkippedRelease {
  metric_id: string;
  metric_name: string;
  date: string;
  reason: string;
}

interface SchedulerSummary {
  total_releases: number;
  epsilon_cap: number;
  epsilon_used: number;
  epsilon_remaining: number;
  advanced_epsilon: number;
  advanced_remaining: number;
  delta_cap: number;
  delta_used: number;
  delta_remaining: number;
  skipped: SkippedRelease[];
}

interface SchedulerOutput {
  schedule: ScheduledRelease[];
  summary: SchedulerSummary;
}

function printUsage(): void {
  console.log(`dprs schedule <config.json> [--output <file>] [--manifest <path>]`);
}

function advancedComposition(epsilons: number[], deltaCap: number, deltaUsed: number): number {
  if (epsilons.length === 0) {
    return 0;
  }
  const sum = epsilons.reduce((acc, value) => acc + value, 0);
  const sumSq = epsilons.reduce((acc, value) => acc + value * value, 0);
  if (deltaCap <= deltaUsed) {
    throw new Error('delta cap exhausted before advanced composition');
  }
  const deltaSlack = Math.max(1e-12, deltaCap - deltaUsed);
  const logTerm = Math.log(1 / deltaSlack);
  const sqrtTerm = Math.sqrt(2 * logTerm * sumSq);
  const expTerm = epsilons.reduce((acc, value) => acc + value * (Math.exp(value) - 1), 0);
  return Math.min(sum, sqrtTerm + expTerm);
}

function verifyProofs(output: SchedulerOutput): void {
  const epsilons: number[] = [];
  let deltaUsed = 0;
  for (const release of output.schedule) {
    epsilons.push(release.epsilon_cost);
    deltaUsed += release.delta_cost;
    const directTotal = epsilons.reduce((acc, value) => acc + value, 0);
    const advanced = advancedComposition(epsilons, output.summary.delta_cap, deltaUsed);
    const tolerance = 1e-6;
    if (Math.abs(release.proof.cumulative_epsilon - directTotal) > tolerance) {
      throw new Error(`proof mismatch for ${release.metric_id}: cumulative epsilon`);
    }
    if (Math.abs(release.proof.advanced_epsilon - advanced) > tolerance) {
      throw new Error(`proof mismatch for ${release.metric_id}: advanced epsilon`);
    }
    if (Math.abs(release.proof.delta_spent - deltaUsed) > tolerance) {
      throw new Error(`proof mismatch for ${release.metric_id}: delta spent`);
    }
  }
}

const moduleDir = dirname(fileURLToPath(import.meta.url));

function resolveManifest(customPath?: string): string {
  if (customPath) {
    return resolve(customPath);
  }
  const envPath = process.env.DPRS_CORE_MANIFEST;
  if (envPath) {
    return resolve(envPath);
  }
  return resolve(join(moduleDir, '../../core/Cargo.toml'));
}

function runScheduler(manifestPath: string, input: SchedulerInput): SchedulerOutput {
  const processResult = spawnSync(
    'cargo',
    ['run', '--quiet', '--manifest-path', manifestPath, '--release'],
    {
      input: JSON.stringify(input),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );

  if (processResult.error) {
    throw processResult.error;
  }
  if (processResult.status !== 0) {
    throw new Error(processResult.stderr || 'dprs-core failed to produce a schedule');
  }
  return JSON.parse(processResult.stdout) as SchedulerOutput;
}

function formatSchedule(output: SchedulerOutput): string {
  const lines: string[] = [];
  lines.push('Differential Privacy Release Schedule');
  lines.push('===================================');
  lines.push(`Total releases scheduled: ${output.summary.total_releases}`);
  lines.push(`Epsilon used (direct): ${output.summary.epsilon_used.toFixed(6)} / ${output.summary.epsilon_cap}`);
  lines.push(`Epsilon used (advanced): ${output.summary.advanced_epsilon.toFixed(6)} / ${output.summary.epsilon_cap}`);
  lines.push(`Delta used: ${output.summary.delta_used.toExponential(4)} / ${output.summary.delta_cap.toExponential(4)}`);
  lines.push('');
  lines.push('Scheduled Releases:');
  for (const release of output.schedule) {
    lines.push(`- [${release.date}] ${release.metric_name} (${release.priority}) :: epsilon ${release.epsilon_cost.toFixed(6)} (remaining ${release.proof.epsilon_remaining.toFixed(6)})`);
  }
  if (output.summary.skipped.length > 0) {
    lines.push('');
    lines.push('Skipped Releases:');
    for (const skipped of output.summary.skipped) {
      lines.push(`- [${skipped.date}] ${skipped.metric_name}: ${skipped.reason}`);
    }
  }
  return lines.join('\n');
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] !== 'schedule') {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }
  let configPath: string | undefined;
  let outputPath: string | undefined;
  let manifestOverride: string | undefined;

  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (!configPath) {
      configPath = arg;
      continue;
    }
    if (arg === '--output') {
      outputPath = args[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--manifest') {
      manifestOverride = args[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unrecognized argument: ${arg}`);
  }

  if (!configPath) {
    printUsage();
    process.exit(1);
  }

  const manifestPath = resolveManifest(manifestOverride);
  const fileContent = readFileSync(resolve(configPath), 'utf-8');
  const input = JSON.parse(fileContent) as SchedulerInput;
  const output = runScheduler(manifestPath, input);

  verifyProofs(output);

  if (outputPath) {
    writeFileSync(resolve(outputPath), JSON.stringify(output, null, 2));
  }

  console.log(formatSchedule(output));
}

try {
  main();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
