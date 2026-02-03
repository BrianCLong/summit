#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { replayEvents } from '../../packages/orchestrator/src/eventlog/replay.js';
import { TaskGraph } from '../../packages/orchestrator/src/scheduler/graph.js';
import { Scheduler } from '../../packages/orchestrator/src/scheduler/transitions.js';

// Drift Check Script
// 1. Replays event log
// 2. Builds state
// 3. Compares with expected state (if provided) or simply validates consistency

async function checkDrift() {
    const logPath = process.env.ORCH_EVENT_LOG || path.join(process.cwd(), 'packages/orchestrator/test/test-event.log');

    if (!fs.existsSync(logPath)) {
        console.log('No event log found. Skipping drift check.');
        return;
    }

    console.log(`Replaying events from ${logPath}...`);
    const events = await replayEvents(logPath);
    console.log(`Loaded ${events.length} events.`);

    const graph = new TaskGraph();
    const scheduler = new Scheduler(graph);

    for (const event of events) {
        try {
            scheduler.applyEvent(event);
        } catch (e) {
            console.error('Error applying event:', e);
            process.exit(1);
        }
    }

    console.log('Replay successful. State built.');
    // TODO: Compare with materialized state file if it exists
}

checkDrift().catch(console.error);
