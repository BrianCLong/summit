#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const replay_js_1 = require("../../packages/orchestrator/src/eventlog/replay.js");
const graph_js_1 = require("../../packages/orchestrator/src/scheduler/graph.js");
const transitions_js_1 = require("../../packages/orchestrator/src/scheduler/transitions.js");
// Drift Check Script
// 1. Replays event log
// 2. Builds state
// 3. Compares with expected state (if provided) or simply validates consistency
async function checkDrift() {
    const logPath = process.env.ORCH_EVENT_LOG || path_1.default.join(process.cwd(), 'packages/orchestrator/test/test-event.log');
    if (!fs_1.default.existsSync(logPath)) {
        console.log('No event log found. Skipping drift check.');
        return;
    }
    console.log(`Replaying events from ${logPath}...`);
    const events = await (0, replay_js_1.replayEvents)(logPath);
    console.log(`Loaded ${events.length} events.`);
    const graph = new graph_js_1.TaskGraph();
    const scheduler = new transitions_js_1.Scheduler(graph);
    for (const event of events) {
        try {
            scheduler.applyEvent(event);
        }
        catch (e) {
            console.error('Error applying event:', e);
            process.exit(1);
        }
    }
    console.log('Replay successful. State built.');
    // TODO: Compare with materialized state file if it exists
}
checkDrift().catch(console.error);
