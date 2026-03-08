"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayRun = void 0;
const agent_orchestrator_js_1 = require("../orchestrator/agent-orchestrator.js");
const parseEventLog = (jsonl) => jsonl
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
const replayRun = (jsonl) => {
    const events = parseEventLog(jsonl);
    const runEvents = events.filter((event) => event.type !== 'LOG_WRITE_FAILED');
    const enqueued = runEvents
        .filter((event) => event.type === 'TASK_ENQUEUED' && event.task_id)
        .map((event) => ({
        id: event.task_id,
        priority: Number(event.metadata.priority ?? 0),
        created_at: String(event.metadata.created_at ?? ''),
        type: 'unknown',
        inputs: {},
    }));
    const expectedOrder = (0, agent_orchestrator_js_1.sortTasksDeterministically)(enqueued).map((task) => task.id);
    const dequeuedOrder = runEvents
        .filter((event) => event.type === 'TASK_DEQUEUED' && event.task_id)
        .map((event) => event.task_id);
    const agentSelections = runEvents
        .filter((event) => event.type === 'AGENT_SELECTED' && event.task_id && event.agent_name)
        .map((event) => ({
        task_id: event.task_id,
        agent_name: event.agent_name,
    }));
    const divergence = [];
    if (expectedOrder.length !== dequeuedOrder.length) {
        divergence.push(`Task count mismatch: expected ${expectedOrder.length}, actual ${dequeuedOrder.length}`);
    }
    for (let index = 0; index < Math.min(expectedOrder.length, dequeuedOrder.length); index += 1) {
        if (expectedOrder[index] !== dequeuedOrder[index]) {
            divergence.push(`Ordering divergence at index ${index}: expected ${expectedOrder[index]}, actual ${dequeuedOrder[index]}`);
        }
    }
    return {
        plan: agentSelections,
        divergence,
    };
};
exports.replayRun = replayRun;
