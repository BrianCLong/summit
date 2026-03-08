"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const schedulerManifest = node_path_1.default.resolve(__dirname, '../../decs/Cargo.toml');
const program = new commander_1.Command();
program
    .name('decs')
    .description('TypeScript CLI for the Data Embargo & Cooling-Off Scheduler');
program
    .command('generate')
    .description('Generate a signed schedule from policy JSON and ingest metadata')
    .requiredOption('--policies <file>', 'Path to embargo policies JSON')
    .requiredOption('--ingests <file>', 'Path to dataset ingest metadata JSON')
    .option('--out <file>', 'Write the schedule JSON to a file')
    .action((options) => {
    const args = [
        'generate',
        '--policies',
        options.policies,
        '--ingests',
        options.ingests,
    ];
    if (options.out) {
        args.push('--output', options.out);
    }
    const stdout = runScheduler(args);
    const schedule = options.out
        ? readJson(options.out)
        : parseJson(stdout);
    renderSchedule(schedule, Boolean(options.out));
});
program
    .command('reconcile')
    .description('Reconcile access logs against a schedule and emit breach alerts')
    .requiredOption('--schedule <file>', 'Signed schedule JSON file')
    .requiredOption('--access-log <file>', 'Access log JSON file')
    .option('--out <file>', 'Write the reconciliation report to a file')
    .action((options) => {
    const args = [
        'reconcile',
        '--schedule',
        options.schedule,
        '--access-log',
        options.accessLog,
    ];
    if (options.out) {
        args.push('--output', options.out);
    }
    const stdout = runScheduler(args);
    const report = options.out
        ? readJson(options.out)
        : parseJson(stdout);
    renderReconciliation(report, Boolean(options.out));
});
program
    .command('simulate')
    .description('Simulate backfill requests to validate embargo enforcement')
    .requiredOption('--schedule <file>', 'Signed schedule JSON file')
    .requiredOption('--requests <file>', 'Backfill request JSON file')
    .option('--out <file>', 'Write the simulation report to a file')
    .action((options) => {
    const args = [
        'simulate',
        '--schedule',
        options.schedule,
        '--requests',
        options.requests,
    ];
    if (options.out) {
        args.push('--output', options.out);
    }
    const stdout = runScheduler(args);
    const report = options.out
        ? readJson(options.out)
        : parseJson(stdout);
    renderSimulation(report, Boolean(options.out));
});
program
    .command('diff')
    .description('Compute a deterministic diff between two signed schedules')
    .requiredOption('--previous <file>', 'Previous schedule JSON file')
    .requiredOption('--current <file>', 'Current schedule JSON file')
    .option('--out <file>', 'Write diff JSON to file')
    .action((options) => {
    const args = [
        'diff',
        '--previous',
        options.previous,
        '--current',
        options.current,
    ];
    if (options.out) {
        args.push('--output', options.out);
    }
    const stdout = runScheduler(args);
    const diff = options.out
        ? readJson(options.out)
        : parseJson(stdout);
    renderDiff(diff, Boolean(options.out));
});
program.parseAsync(process.argv);
function runScheduler(args) {
    const schedulerBin = process.env.DECS_SCHEDULER_BIN;
    if (schedulerBin) {
        const result = (0, node_child_process_1.spawnSync)(schedulerBin, args, { encoding: 'utf-8' });
        handleSpawnResult(result);
        return result.stdout.trim();
    }
    if (!node_fs_1.default.existsSync(schedulerManifest)) {
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
        ...args,
    ];
    const result = (0, node_child_process_1.spawnSync)('cargo', cargoArgs, { encoding: 'utf-8' });
    handleSpawnResult(result);
    return result.stdout.trim();
}
function handleSpawnResult(result) {
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        const stderr = result.stderr ? result.stderr.toString() : '';
        throw new Error(stderr || 'Scheduler command failed');
    }
}
function parseJson(payload) {
    if (!payload) {
        throw new Error('Expected JSON output but command returned empty response');
    }
    return JSON.parse(payload);
}
function readJson(file) {
    const contents = node_fs_1.default.readFileSync(file, 'utf-8');
    return JSON.parse(contents);
}
function renderSchedule(schedule, wroteFile) {
    if (wroteFile) {
        console.log(`Signed schedule written. Signature: ${schedule.signature}`);
    }
    else {
        console.log(`Signed schedule generated at ${schedule.generated_at}`);
    }
    console.log(`Entries: ${schedule.entries.length}`);
    for (const entry of schedule.entries) {
        const versionLabel = entry.dataset_version
            ? ` (version ${entry.dataset_version})`
            : '';
        console.log(`• ${entry.dataset}${versionLabel} :: ${entry.region} → storage ${entry.storage_gate.open_at}, api ${entry.api_gate.open_at}`);
        if (entry.exceptions.length > 0) {
            for (const exception of entry.exceptions) {
                console.log(`    ↳ exception for ${exception.principal} after ${exception.allow_after}`);
            }
        }
    }
}
function renderReconciliation(report, wroteFile) {
    const prefix = wroteFile
        ? 'Reconciliation report saved.'
        : 'Reconciliation complete.';
    console.log(`${prefix} Proof token: ${report.proof_token}`);
    if (report.zero_breach_proof) {
        console.log('✅ No embargo breaches detected.');
    }
    else {
        console.log(`⚠️ ${report.breaches.length} embargo breach(es) detected:`);
        for (const breach of report.breaches) {
            console.log(`• ${breach.event.dataset}/${breach.event.region} principal ${breach.event.principal} at ${breach.event.occurred_at} before ${breach.gate_open_at}`);
        }
    }
}
function renderSimulation(report, wroteFile) {
    const prefix = wroteFile
        ? 'Simulation report saved.'
        : 'Simulation completed.';
    console.log(prefix);
    if (report.all_safe) {
        console.log('✅ All backfill requests respect embargo gates.');
    }
    else {
        console.log('⚠️ Some backfill requests violate embargo gates:');
        for (const result of report.results.filter((item) => !item.allowed)) {
            console.log(`• ${result.request.dataset}/${result.request.region} at ${result.request.requested_at} blocked until ${result.gate_open_at} (${result.reason})`);
        }
    }
}
function renderDiff(diff, wroteFile) {
    const prefix = wroteFile ? 'Schedule diff saved.' : 'Schedule diff computed.';
    console.log(prefix);
    if (diff.length === 0) {
        console.log('No differences detected.');
        return;
    }
    for (const change of diff) {
        console.log(`• ${change.dataset}/${change.region} field ${change.field}: ${change.previous} → ${change.current}`);
    }
}
