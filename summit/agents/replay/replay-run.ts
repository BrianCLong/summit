import type { AgentEvent } from '../types.js';

import { sortTasksDeterministically } from '../orchestrator/agent-orchestrator.js';

export interface ReplayPlanItem {
  task_id: string;
  agent_name: string;
}

export interface ReplayReport {
  plan: ReplayPlanItem[];
  divergence: string[];
}

const parseEventLog = (jsonl: string): AgentEvent[] =>
  jsonl
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as AgentEvent);

export const replayRun = (jsonl: string): ReplayReport => {
  const events = parseEventLog(jsonl);
  const runEvents = events.filter((event) => event.type !== 'LOG_WRITE_FAILED');

  const enqueued = runEvents
    .filter((event) => event.type === 'TASK_ENQUEUED' && event.task_id)
    .map((event) => ({
      id: event.task_id as string,
      priority: Number(event.metadata.priority ?? 0),
      created_at: String(event.metadata.created_at ?? ''),
      type: 'unknown',
      inputs: {},
    }));

  const expectedOrder = sortTasksDeterministically(enqueued).map((task) => task.id);
  const dequeuedOrder = runEvents
    .filter((event) => event.type === 'TASK_DEQUEUED' && event.task_id)
    .map((event) => event.task_id as string);

  const agentSelections = runEvents
    .filter((event) => event.type === 'AGENT_SELECTED' && event.task_id && event.agent_name)
    .map((event) => ({
      task_id: event.task_id as string,
      agent_name: event.agent_name as string,
    }));

  const divergence: string[] = [];
  if (expectedOrder.length !== dequeuedOrder.length) {
    divergence.push(
      `Task count mismatch: expected ${expectedOrder.length}, actual ${dequeuedOrder.length}`,
    );
  }

  for (let index = 0; index < Math.min(expectedOrder.length, dequeuedOrder.length); index += 1) {
    if (expectedOrder[index] !== dequeuedOrder[index]) {
      divergence.push(
        `Ordering divergence at index ${index}: expected ${expectedOrder[index]}, actual ${dequeuedOrder[index]}`,
      );
    }
  }

  return {
    plan: agentSelections,
    divergence,
  };
};
