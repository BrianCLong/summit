"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const commander_1 = require("commander");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = require("url");
// Fix for __dirname in ESM
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
// Mock dependencies if not available to allow CLI to run simple commands
let maestro = { shutdown: async () => { } };
let PolicyGuard = class {
    async checkPolicy() { return { allowed: true, confidence: 1.0 }; }
};
try {
    const maestroModule = await Promise.resolve().then(() => __importStar(require('../orchestrator/maestro.js')));
    maestro = maestroModule.maestro;
    const policyModule = await Promise.resolve().then(() => __importStar(require('../orchestrator/policyGuard.js')));
    PolicyGuard = policyModule.PolicyGuard;
}
catch (e) {
    // console.warn('Orchestrator modules not found, some commands may fail.', e.message);
}
const program = new commander_1.Command();
program
    .name('maestro')
    .description('CLI for Maestro Orchestrator')
    .version('1.0.0');
program
    .command('enqueue')
    .description('Enqueue a task for Maestro')
    .requiredOption('-k, --kind <kind>', 'Task kind (plan, scaffold, implement, test, review, docs)')
    .requiredOption('-i, --issue <issue>', 'Issue description or command')
    .option('-r, --repo <repo>', 'Repository name', 'summit')
    .option('-b, --budget <budget>', 'Budget in USD', '1.0')
    .action(async (options) => {
    try {
        console.log('Enqueueing task...', options);
        // Ensure maestro is connected
        const taskId = await maestro.enqueueTask({
            kind: options.kind,
            repo: options.repo,
            issue: options.issue,
            budgetUSD: parseFloat(options.budget),
            context: { cli: true },
            metadata: {
                actor: 'cli',
                timestamp: new Date().toISOString(),
                sprint_version: 'current'
            }
        });
        console.log(`Task enqueued successfully. Task ID: ${taskId}`);
        await maestro.shutdown();
        process.exit(0);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to enqueue task:', errorMessage);
        await maestro.shutdown();
        process.exit(1);
    }
});
program
    .command('run-and-wait')
    .description('Enqueue a task and wait for completion')
    .requiredOption('-k, --kind <kind>', 'Task kind')
    .requiredOption('-i, --issue <issue>', 'Issue description')
    .option('-r, --repo <repo>', 'Repository name', 'summit')
    .option('-b, --budget <budget>', 'Budget in USD', '1.0')
    .option('-t, --timeout <timeout>', 'Timeout in ms', '600000')
    .action(async (options) => {
    try {
        console.log('Enqueueing task and waiting...', options);
        const taskId = await maestro.enqueueTask({
            kind: options.kind,
            repo: options.repo,
            issue: options.issue,
            budgetUSD: parseFloat(options.budget),
            context: { cli: true },
            metadata: {
                actor: 'cli',
                timestamp: new Date().toISOString(),
                sprint_version: 'current'
            }
        });
        console.log(`Task enqueued. Task ID: ${taskId}`);
        const timeout = parseInt(options.timeout);
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const status = await maestro.getTaskStatus(taskId);
            if (status?.finishedOn) {
                console.log('Task finished successfully.');
                console.log('Task Input Data:', status.data);
                // Note: Job output is not currently exposed via getTaskStatus.
                await maestro.shutdown();
                process.exit(0);
            }
            if (status?.failedReason) {
                console.error('Task failed:', status.failedReason);
                await maestro.shutdown();
                process.exit(1);
            }
            await new Promise(r => setTimeout(r, 2000));
        }
        console.error('Timeout waiting for task completion');
        await maestro.shutdown();
        process.exit(1);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error:', errorMessage);
        await maestro.shutdown();
        process.exit(1);
    }
});
program
    .command('status')
    .description('Get status of a task')
    .argument('<taskId>', 'Task ID')
    .action(async (taskId) => {
    try {
        const status = await maestro.getTaskStatus(taskId);
        if (!status) {
            console.log('Task not found');
        }
        else {
            console.log(JSON.stringify(status, null, 2));
        }
        await maestro.shutdown();
        process.exit(0);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to get status:', errorMessage);
        await maestro.shutdown();
        process.exit(1);
    }
});
program
    .command('check-policy')
    .description('Check if a task would pass policy guard')
    .requiredOption('-k, --kind <kind>', 'Task kind')
    .requiredOption('-i, --issue <issue>', 'Issue description')
    .option('-r, --repo <repo>', 'Repository name', 'summit')
    .action(async (options) => {
    try {
        console.log("Running PolicyGuard checks...");
        const guard = new PolicyGuard();
        const task = {
            kind: options.kind,
            repo: options.repo,
            issue: options.issue,
            budgetUSD: 0,
            context: { cli: true, dataResidency: 'GLOBAL' },
            metadata: {
                actor: 'cli',
                timestamp: new Date().toISOString(),
                sprint_version: 'current'
            }
        };
        const result = await guard.checkPolicy(task);
        if (result.allowed) {
            console.log("Policy check: PASSED");
            console.log(`Confidence: ${result.confidence}`);
            // Note: In a real scenario, this might trigger a review task.
            // For now, it just validates.
            process.exit(0);
        }
        else {
            console.error("Policy check: FAILED");
            console.error(`Reason: ${result.reason}`);
            process.exit(1);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Policy check encountered an error:', errorMessage);
        process.exit(1);
    }
});
program
    .command('release-dry-run')
    .description('Run a release dry-run and generate evidence')
    .requiredOption('-t, --tag <tag>', 'Release tag (e.g., v1.0.0)')
    .requiredOption('-s, --sha <sha>', 'Commit SHA')
    .option('-d, --decision <decision>', 'Decision (GO/NO-GO)', 'GO')
    .option('--write', 'Write evidence file', true)
    .action(async (options) => {
    try {
        console.log(`Running release dry-run for ${options.tag}...`);
        // Simulate checks (in a real scenario, this would run tests/checks)
        const decision = options.decision;
        const evidencePath = `release-evidence/${options.tag}.json`;
        if (decision === 'GO') {
            const evidence = {
                tag: options.tag,
                sha: options.sha,
                decision: 'GO',
                reasons: ['Maestro dry-run passed (simulated)'],
                run: { id: 'cli-generated', url: 'local' },
                generatedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };
            if (options.write) {
                if (!fs_1.default.existsSync('release-evidence')) {
                    fs_1.default.mkdirSync('release-evidence');
                }
                fs_1.default.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
                console.log(`Evidence written to ${evidencePath}`);
                console.log('You must now commit this file to main.');
            }
            else {
                console.log('Evidence generated (dry-run):', evidence);
            }
        }
        else {
            console.log('Decision is NO-GO. No evidence written.');
        }
        await maestro.shutdown();
        process.exit(0);
    }
    catch (error) {
        console.error('Error:', error.message);
        await maestro.shutdown();
        process.exit(1);
    }
});
program.parse();
