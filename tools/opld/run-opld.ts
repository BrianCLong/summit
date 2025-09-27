#!/usr/bin/env ts-node
/**
 * Orchestrates the OPLD Python CLI and surfaces CI-friendly output.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type CliArgs = {
  baseline: string;
  candidate: string;
  threshold?: number;
  output?: string;
  python?: string;
  pretty?: boolean;
  noCiExit?: boolean;
};

type ReportSummary = {
  baseline_total: number;
  candidate_total: number;
  delta_total: number;
  leak_delta_score: number;
  threshold: number;
  ci_gate: 'pass' | 'fail';
};

type PerTypeDelta = {
  entity_type: string;
  baseline: number;
  candidate: number;
  delta: number;
  delta_ratio: number;
};

type EntityDiff = {
  entity_type: string;
  value: string;
  delta: number;
  status: 'regression' | 'improvement';
  baseline_occurrences: Array<{ prompt_id: string; log_index: number }>;
  candidate_occurrences: Array<{ prompt_id: string; log_index: number }>;
};

type LeakReport = {
  summary: ReportSummary;
  per_type: PerTypeDelta[];
  per_entity: EntityDiff[];
  metadata: Record<string, unknown>;
};

function requireNext(argv: string[], index: number, flag: string): string {
  if (index >= argv.length) {
    throw new Error(`Expected a value after ${flag}`);
  }
  return argv[index];
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { baseline: '', candidate: '' };
  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    switch (current) {
      case '--baseline': {
        const value = requireNext(argv, ++i, current);
        args.baseline = resolve(value);
        break;
      }
      case '--candidate': {
        const value = requireNext(argv, ++i, current);
        args.candidate = resolve(value);
        break;
      }
      case '--threshold': {
        const value = requireNext(argv, ++i, current);
        args.threshold = Number(value);
        break;
      }
      case '--output': {
        const value = requireNext(argv, ++i, current);
        args.output = resolve(value);
        break;
      }
      case '--python': {
        const value = requireNext(argv, ++i, current);
        args.python = value;
        break;
      }
      case '--pretty':
        args.pretty = true;
        break;
      case '--no-ci-exit':
        args.noCiExit = true;
        break;
      default:
        throw new Error(`Unknown argument: ${current}`);
    }
  }
  if (!args.baseline || !args.candidate) {
    throw new Error('Both --baseline and --candidate arguments are required.');
  }
  if (!existsSync(args.baseline)) {
    throw new Error(`Baseline path does not exist: ${args.baseline}`);
  }
  if (!existsSync(args.candidate)) {
    throw new Error(`Candidate path does not exist: ${args.candidate}`);
  }
  return args;
}

function runPython(args: CliArgs): LeakReport {
  const pythonExec = args.python ?? 'python3';
  const moduleDir = typeof __dirname === 'string' ? __dirname : fileURLToPath(new URL('.', import.meta.url));
  const cliPath = resolve(moduleDir, 'cli.py');
  const cmdArgs = [cliPath, '--baseline', args.baseline, '--candidate', args.candidate];
  if (typeof args.threshold === 'number' && Number.isFinite(args.threshold)) {
    cmdArgs.push('--threshold', String(args.threshold));
  }
  if (args.output) {
    cmdArgs.push('--output', args.output);
  }
  if (args.pretty) {
    cmdArgs.push('--pretty');
  }
  cmdArgs.push('--no-ci-exit');
  const result = spawnSync(pythonExec, cmdArgs, { encoding: 'utf8' });
  if (result.error) {
    throw result.error;
  }
  if (result.status && result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`OPLD python process exited with status ${result.status}`);
  }
  const stdout = result.stdout.trim();
  if (!stdout) {
    throw new Error('OPLD python process did not return output.');
  }
  try {
    return JSON.parse(stdout) as LeakReport;
  } catch (error) {
    throw new Error(`Failed to parse OPLD report JSON: ${(error as Error).message}`);
  }
}

function renderReport(report: LeakReport): string {
  const lines: string[] = [];
  lines.push('OPLD :: Output PII Leak Delta Summary');
  lines.push(`  Baseline total leaks : ${report.summary.baseline_total}`);
  lines.push(`  Candidate total leaks: ${report.summary.candidate_total}`);
  lines.push(`  Delta total           : ${report.summary.delta_total}`);
  lines.push(`  Leak delta score      : ${report.summary.leak_delta_score.toFixed(3)} (threshold=${report.summary.threshold})`);
  lines.push(`  CI gate               : ${report.summary.ci_gate.toUpperCase()}`);
  lines.push('');
  if (report.per_type.length > 0) {
    lines.push('Per-entity-type deltas:');
    for (const entry of report.per_type) {
      lines.push(
        `  - ${entry.entity_type}: baseline=${entry.baseline} candidate=${entry.candidate} delta=${entry.delta} ratio=${entry.delta_ratio.toFixed(3)}`,
      );
    }
    lines.push('');
  }
  if (report.per_entity.length > 0) {
    lines.push('Entity regressions/improvements:');
    for (const diff of report.per_entity) {
      lines.push(
        `  - [${diff.status.toUpperCase()}] ${diff.entity_type} :: ${diff.value} (delta=${diff.delta}) baseline=${diff.baseline_occurrences.length} candidate=${diff.candidate_occurrences.length}`,
      );
    }
  }
  return lines.join('\n');
}

function main(): void {
  try {
    const args = parseArgs(process.argv);
    const report = runPython(args);
    const summary = renderReport(report);
    console.log(summary);
    if (!args.noCiExit && report.summary.ci_gate === 'fail') {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`[opld] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

main();
