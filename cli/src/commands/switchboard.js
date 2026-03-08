"use strict";
/**
 * Switchboard Commands
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSwitchboardCommands = registerSwitchboardCommands;
const sandbox_js_1 = require("../lib/sandbox.js");
const switchboard_runner_js_1 = require("../lib/switchboard-runner.js");
const switchboard_evidence_js_1 = require("../lib/switchboard-evidence.js");
const switchboard_replay_js_1 = require("../lib/switchboard-replay.js");
function registerSwitchboardCommands(program) {
    const switchboard = program
        .command('switchboard')
        .description('Switchboard capsule operations');
    switchboard
        .command('run')
        .description('Run a task capsule')
        .requiredOption('--capsule <path>', 'Path to capsule manifest')
        .option('--waiver <token>', 'Apply a waiver token if policy denies an action')
        .action(async (options) => {
        try {
            const repoRoot = (0, sandbox_js_1.detectRepoRoot)(process.cwd());
            const result = await (0, switchboard_runner_js_1.runCapsule)({
                manifestPath: options.capsule,
                repoRoot,
                waiverToken: options.waiver,
            });
            console.log(`Capsule session: ${result.sessionId}`);
            console.log(`Ledger: ${result.ledgerPath}`);
            console.log(`Diff: ${result.diffPath}`);
        }
        catch (error) {
            console.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    switchboard
        .command('evidence <session_id>')
        .description('Generate an evidence bundle for a capsule session')
        .action((sessionId) => {
        try {
            const repoRoot = (0, sandbox_js_1.detectRepoRoot)(process.cwd());
            const result = (0, switchboard_evidence_js_1.generateEvidenceBundle)(repoRoot, sessionId);
            console.log(`Evidence bundle: ${result.evidenceDir}`);
        }
        catch (error) {
            console.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
    switchboard
        .command('replay <session_id>')
        .description('Replay a capsule session and compare outputs')
        .action(async (sessionId) => {
        try {
            const repoRoot = (0, sandbox_js_1.detectRepoRoot)(process.cwd());
            const report = await (0, switchboard_replay_js_1.replayCapsule)(repoRoot, sessionId);
            console.log(`Replay session: ${report.replay_session}`);
            console.log(`Replay match: ${report.match ? 'yes' : 'no'}`);
            if (!report.match) {
                console.log(`Differences: ${report.differences.join('; ')}`);
            }
        }
        catch (error) {
            console.error(error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
}
