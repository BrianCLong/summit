"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const orchestrator_1 = require("@summit/orchestrator");
exports.replayCommand = new commander_1.Command('replay')
    .description('Replay a past run to verify determinism')
    .requiredOption('--run <run_id>', 'Run ID to replay')
    .action(async (options) => {
    const runId = options.run;
    const baseDir = path_1.default.join(os_1.default.homedir(), '.summit', 'runs', runId);
    const manifestPath = path_1.default.join(baseDir, 'manifest.json');
    const logPath = path_1.default.join(baseDir, 'events.jsonl');
    console.log(chalk_1.default.bold(`\nSummit Replay Tool\n`));
    console.log(`Run ID: ${chalk_1.default.cyan(runId)}`);
    console.log(`Base Dir: ${baseDir}`);
    try {
        if (!fs_1.default.existsSync(manifestPath)) {
            console.error(chalk_1.default.red(`Manifest not found at ${manifestPath}`));
            process.exit(1);
        }
        console.log(chalk_1.default.dim('Loading manifest...'));
        const manifest = await (0, orchestrator_1.loadRunManifest)(manifestPath);
        console.log(`Seed: ${manifest.seed_values.global_seed}`);
        console.log(`Created: ${manifest.created_at}`);
        if (!fs_1.default.existsSync(logPath)) {
            console.error(chalk_1.default.red(`Event log not found at ${logPath}`));
            process.exit(1);
        }
        console.log(chalk_1.default.dim('Loading events...'));
        const events = await (0, orchestrator_1.replayEvents)(logPath);
        console.log(`Loaded ${events.length} events.`);
        console.log(chalk_1.default.dim('Replaying orchestration...'));
        const graph = new orchestrator_1.TaskGraph();
        const scheduler = new orchestrator_1.Scheduler(graph);
        for (const event of events) {
            scheduler.applyEvent(event);
        }
        const finalHash = graph.getHash();
        console.log(`Final Graph Hash: ${chalk_1.default.yellow(finalHash)}`);
        if (manifest.final_state_hash) {
            if (manifest.final_state_hash === finalHash) {
                console.log(chalk_1.default.green('✔ SUCCESS: Replay hash matches manifest hash.'));
            }
            else {
                console.error(chalk_1.default.red('✘ FAILURE: Replay hash DOES NOT match manifest hash.'));
                console.error(`Expected: ${manifest.final_state_hash}`);
                console.error(`Actual:   ${finalHash}`);
                process.exit(1);
            }
        }
        else {
            console.log(chalk_1.default.yellow('⚠ Manifest does not contain final_state_hash. Verification skipped.'));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`Replay failed: ${error.message}`));
        process.exit(1);
    }
});
