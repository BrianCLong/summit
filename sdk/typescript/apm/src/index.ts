import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export interface TaskGoal {
  required_columns: string[];
  accuracy_target: number;
}

export interface TableSpec {
  name: string;
  alias?: string;
  row_count: number;
  columns: string[];
}

export interface JoinStat {
  alias: string;
  accuracy_if_removed: number;
  relative_cost: number;
}

export interface Exposure {
  columns: number;
  rows: number;
}

export interface ExposureDelta {
  baseline: Exposure;
  reduced: Exposure;
}

export interface PlanRequest {
  baseline_sql: string;
  goal: TaskGoal;
  tables: TableSpec[];
  joins: JoinStat[];
}

export interface PlanResponse {
  reduced_sql: string;
  exposure_delta: ExposureDelta;
  achieved_accuracy: number;
  removed_joins: string[];
}

export interface SimulationRequest {
  baseline_sql: string;
  tables: TableSpec[];
  joins: JoinStat[];
}

export interface SimulationPoint {
  removed_joins: string[];
  achieved_accuracy: number;
  estimated_cost: number;
}

export interface CliOptions {
  binaryPath?: string;
  manifestPath?: string;
  release?: boolean;
}

function resolveManifestPath(explicit?: string): string {
  if (explicit) {
    return explicit;
  }
  if (process.env.APM_CARGO_MANIFEST) {
    return process.env.APM_CARGO_MANIFEST;
  }
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDir, '../../../..', 'apm', 'Cargo.toml');
}

function runCli<T>(command: 'plan' | 'simulate', payload: unknown, options?: CliOptions): T {
  const input = JSON.stringify(payload);
  const binaryPath = options?.binaryPath ?? process.env.APM_CLI_PATH;
  if (binaryPath) {
    const result = spawnSync(binaryPath, [command], {
      input,
      encoding: 'utf8',
    });
    return handleCliResult<T>(result);
  }

  const manifestPath = resolveManifestPath(options?.manifestPath);
  const args = ['run', '--quiet', '--manifest-path', manifestPath, '--bin', 'apm-cli'];
  if (options?.release || process.env.APM_CLI_RELEASE === '1') {
    args.splice(1, 0, '--release');
  }
  args.push('--', command);

  const result = spawnSync('cargo', args, {
    input,
    encoding: 'utf8',
  });
  return handleCliResult<T>(result);
}

function handleCliResult<T>(result: ReturnType<typeof spawnSync>): T {
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = (result.stderr ?? '').toString().trim();
    throw new Error(`apm cli exited with status ${result.status}: ${stderr}`);
  }
  const stdout = (result.stdout ?? '').toString();
  if (!stdout.length) {
    throw new Error('apm cli produced no output');
  }
  return JSON.parse(stdout) as T;
}

export function planQuery(request: PlanRequest, options?: CliOptions): PlanResponse {
  return runCli<PlanResponse>('plan', request, options);
}

export function simulateTradeoffs(
  request: SimulationRequest,
  options?: CliOptions,
): SimulationPoint[] {
  return runCli<SimulationPoint[]>('simulate', request, options);
}
