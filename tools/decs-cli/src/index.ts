import { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type AccessChannel = 'storage' | 'api';

type ExceptionRule = {
  principal: string;
  allow_after: string;
};

type Gate = {
  open_at: string;
  channel: AccessChannel;
};

type ScheduleEntry = {
  dataset: string;
  dataset_version?: string | null;
  region: string;
  embargo_until: string;
  cooling_off_until: string;
  storage_gate: Gate;
  api_gate: Gate;
  exceptions: ExceptionRule[];
};

type SignedSchedule = {
  generated_at: string;
  entries: ScheduleEntry[];
  signature: string;
};

type BreachFinding = {
  event: {
    dataset: string;
    region: string;
    principal: string;
    occurred_at: string;
    channel: AccessChannel;
  };
  gate_open_at: string;
};

type ReconciliationReport = {
  schedule_signature: string;
  evaluated_events: number;
  breaches: BreachFinding[];
  zero_breach_proof: boolean;
  proof_token: string;
};

type SimulationResult = {
  request: {
    dataset: string;
    region: string;
    requested_at: string;
    channel: AccessChannel;
  };
  allowed: boolean;
  gate_open_at: string;
  reason: string;
};

type SimulationReport = {
  results: SimulationResult[];
  all_safe: boolean;
};

type ScheduleDiff = {
  dataset: string;
  region: string;
  field: string;
  previous: string;
  current: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schedulerManifest = path.resolve(__dirname, '../../decs/Cargo.toml');

const program = new Command();
program.name('decs').description('TypeScript CLI for the Data Embargo & Cooling-Off Scheduler');

program
  .command('generate')
  .description('Generate a signed schedule from policy JSON and ingest metadata')
  .requiredOption('--policies <file>', 'Path to embargo policies JSON')
  .requiredOption('--ingests <file>', 'Path to dataset ingest metadata JSON')
  .option('--out <file>', 'Write the schedule JSON to a file')
  .action((options) => {
    const args = ['generate', '--policies', options.policies, '--ingests', options.ingests];
    if (options.out) {
      args.push('--output', options.out);
    }
    const stdout = runScheduler(args);
    const schedule = options.out
      ? readJson<SignedSchedule>(options.out)
      : parseJson<SignedSchedule>(stdout);
    renderSchedule(schedule, Boolean(options.out));
  });

program
  .command('reconcile')
  .description('Reconcile access logs against a schedule and emit breach alerts')
  .requiredOption('--schedule <file>', 'Signed schedule JSON file')
  .requiredOption('--access-log <file>', 'Access log JSON file')
  .option('--out <file>', 'Write the reconciliation report to a file')
  .action((options) => {
    const args = ['reconcile', '--schedule', options.schedule, '--access-log', options.accessLog];
    if (options.out) {
      args.push('--output', options.out);
    }
    const stdout = runScheduler(args);
    const report = options.out
      ? readJson<ReconciliationReport>(options.out)
      : parseJson<ReconciliationReport>(stdout);
    renderReconciliation(report, Boolean(options.out));
  });

program
  .command('simulate')
  .description('Simulate backfill requests to validate embargo enforcement')
  .requiredOption('--schedule <file>', 'Signed schedule JSON file')
  .requiredOption('--requests <file>', 'Backfill request JSON file')
  .option('--out <file>', 'Write the simulation report to a file')
  .action((options) => {
    const args = ['simulate', '--schedule', options.schedule, '--requests', options.requests];
    if (options.out) {
      args.push('--output', options.out);
    }
    const stdout = runScheduler(args);
    const report = options.out
      ? readJson<SimulationReport>(options.out)
      : parseJson<SimulationReport>(stdout);
    renderSimulation(report, Boolean(options.out));
  });

program
  .command('diff')
  .description('Compute a deterministic diff between two signed schedules')
  .requiredOption('--previous <file>', 'Previous schedule JSON file')
  .requiredOption('--current <file>', 'Current schedule JSON file')
  .option('--out <file>', 'Write diff JSON to file')
  .action((options) => {
    const args = ['diff', '--previous', options.previous, '--current', options.current];
    if (options.out) {
      args.push('--output', options.out);
    }
    const stdout = runScheduler(args);
    const diff = options.out
      ? readJson<ScheduleDiff[]>(options.out)
      : parseJson<ScheduleDiff[]>(stdout);
    renderDiff(diff, Boolean(options.out));
  });

program.parseAsync(process.argv);

function runScheduler(args: string[]): string {
  const schedulerBin = process.env.DECS_SCHEDULER_BIN;
  if (schedulerBin) {
    const result = spawnSync(schedulerBin, args, { encoding: 'utf-8' });
    handleSpawnResult(result);
    return result.stdout.trim();
  }

  if (!fs.existsSync(schedulerManifest)) {
    throw new Error(`Unable to locate Cargo manifest at ${schedulerManifest}`);
  }
  const cargoArgs = [
    'run',
    '--manifest-path',
    schedulerManifest,
    '--quiet',
    '--bin',
    'decs-scheduler',
    '--',
    ...args
  ];
  const result = spawnSync('cargo', cargoArgs, { encoding: 'utf-8' });
  handleSpawnResult(result);
  return result.stdout.trim();
}

function handleSpawnResult(result: ReturnType<typeof spawnSync>): void {
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.toString() : '';
    throw new Error(stderr || 'Scheduler command failed');
  }
}

function parseJson<T>(payload: string): T {
  if (!payload) {
    throw new Error('Expected JSON output but command returned empty response');
  }
  return JSON.parse(payload) as T;
}

function readJson<T>(file: string): T {
  const contents = fs.readFileSync(file, 'utf-8');
  return JSON.parse(contents) as T;
}

function renderSchedule(schedule: SignedSchedule, wroteFile: boolean): void {
  if (wroteFile) {
    console.log(`Signed schedule written. Signature: ${schedule.signature}`);
  } else {
    console.log(`Signed schedule generated at ${schedule.generated_at}`);
  }
  console.log(`Entries: ${schedule.entries.length}`);
  for (const entry of schedule.entries) {
    const versionLabel = entry.dataset_version ? ` (version ${entry.dataset_version})` : '';
    console.log(
      `• ${entry.dataset}${versionLabel} :: ${entry.region} → storage ${entry.storage_gate.open_at}, api ${entry.api_gate.open_at}`
    );
    if (entry.exceptions.length > 0) {
      for (const exception of entry.exceptions) {
        console.log(`    ↳ exception for ${exception.principal} after ${exception.allow_after}`);
      }
    }
  }
}

function renderReconciliation(report: ReconciliationReport, wroteFile: boolean): void {
  const prefix = wroteFile ? 'Reconciliation report saved.' : 'Reconciliation complete.';
  console.log(`${prefix} Proof token: ${report.proof_token}`);
  if (report.zero_breach_proof) {
    console.log('✅ No embargo breaches detected.');
  } else {
    console.log(`⚠️ ${report.breaches.length} embargo breach(es) detected:`);
    for (const breach of report.breaches) {
      console.log(
        `• ${breach.event.dataset}/${breach.event.region} principal ${breach.event.principal} at ${breach.event.occurred_at} before ${breach.gate_open_at}`
      );
    }
  }
}

function renderSimulation(report: SimulationReport, wroteFile: boolean): void {
  const prefix = wroteFile ? 'Simulation report saved.' : 'Simulation completed.';
  console.log(prefix);
  if (report.all_safe) {
    console.log('✅ All backfill requests respect embargo gates.');
  } else {
    console.log('⚠️ Some backfill requests violate embargo gates:');
    for (const result of report.results.filter((item) => !item.allowed)) {
      console.log(
        `• ${result.request.dataset}/${result.request.region} at ${result.request.requested_at} blocked until ${result.gate_open_at} (${result.reason})`
      );
    }
  }
}

function renderDiff(diff: ScheduleDiff[], wroteFile: boolean): void {
  const prefix = wroteFile ? 'Schedule diff saved.' : 'Schedule diff computed.';
  console.log(prefix);
  if (diff.length === 0) {
    console.log('No differences detected.');
    return;
  }
  for (const change of diff) {
    console.log(
      `• ${change.dataset}/${change.region} field ${change.field}: ${change.previous} → ${change.current}`
    );
  }
}

