"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const index_js_1 = require("../packages/orchestrator/src/index.js");
async function main() {
    const args = process.argv.slice(2);
    let outputDir = args[0];
    const seed = 12345;
    const runId = `test-run-${seed}`; // Fixed Run ID
    const fixedTime = "2026-02-01T12:00:00.000Z"; // Fixed Time
    console.log(`Starting deterministic test run: ${runId}`);
    (0, index_js_1.setGlobalSeed)(seed);
    // If outputDir is provided, save strictly there (no subdirectory).
    // Otherwise default to ~/.summit/runs/{runId}
    const baseDir = outputDir ? path_1.default.resolve(outputDir) : path_1.default.join(os_1.default.homedir(), '.summit', 'runs', runId);
    const manifestPath = path_1.default.join(baseDir, 'manifest.json');
    const logPath = path_1.default.join(baseDir, 'events.jsonl');
    await fs_extra_1.default.ensureDir(baseDir);
    // Clean up if exists to ensure fresh run
    if (!outputDir) {
        await fs_extra_1.default.remove(baseDir);
        await fs_extra_1.default.ensureDir(baseDir);
    }
    else {
        await fs_extra_1.default.emptyDir(baseDir);
    }
    // 1. Initialize Graph
    const graph = new index_js_1.TaskGraph();
    const scheduler = new index_js_1.Scheduler(graph);
    // 2. Generate Events
    const events = [];
    // Event 1: Create Task A (using input-based UUID)
    const taskIdA = (0, index_js_1.deterministicUUID)('task', 'task-a-input');
    const eventA = {
        evidence_id: (0, index_js_1.deterministicUUID)('evidence', 'ev-1'),
        type: 'TASK_CREATED',
        team_id: 'team-alpha',
        payload: {
            id: taskIdA,
            subject: 'Task A',
            status: 'pending',
            blockedBy: [],
            blocks: [],
            timestamps: { created: fixedTime }
        }
    };
    events.push(eventA);
    // Event 2: Create Task B (blocked by A)
    const taskIdB = (0, index_js_1.deterministicUUID)('task', 'task-b-input');
    const eventB = {
        evidence_id: (0, index_js_1.deterministicUUID)('evidence', 'ev-2'),
        type: 'TASK_CREATED',
        team_id: 'team-alpha',
        payload: {
            id: taskIdB,
            subject: 'Task B',
            status: 'pending',
            blockedBy: [taskIdA],
            blocks: [],
            timestamps: { created: fixedTime }
        }
    };
    events.push(eventB);
    // Event 3: Start Task A (using random UUID)
    const eventStartA = {
        evidence_id: (0, index_js_1.deterministicUUID)('evidence'), // Sequence based
        type: 'TASK_STARTED',
        team_id: 'team-alpha',
        payload: {
            taskId: taskIdA,
            agentId: 'agent-007',
            timestamp: fixedTime
        }
    };
    events.push(eventStartA);
    // Event 4: Complete Task A
    const eventCompleteA = {
        evidence_id: (0, index_js_1.deterministicUUID)('evidence'), // Sequence based
        type: 'TASK_COMPLETED',
        team_id: 'team-alpha',
        payload: {
            taskId: taskIdA,
            timestamp: fixedTime
        }
    };
    events.push(eventCompleteA);
    // 3. Save Events and Apply to Scheduler
    for (const event of events) {
        await (0, index_js_1.appendEvent)(logPath, event);
        scheduler.applyEvent(event);
    }
    // 4. Calculate Final Hash
    const finalHash = graph.getHash();
    console.log(`Final Graph Hash: ${finalHash}`);
    // 5. Generate and Save Manifest
    const manifest = (0, index_js_1.generateRunManifest)(runId, seed, {
        final_state_hash: finalHash,
        agent_graph_version: 'v1.0.0',
        created_at: fixedTime // Override created_at for determinism
    });
    await (0, index_js_1.saveRunManifest)(manifest, manifestPath);
    console.log(`Run completed. Artifacts saved to ${baseDir}`);
    // Output Run ID for the caller (workflow)
    console.log(`::set-output name=run_id::${runId}`);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
