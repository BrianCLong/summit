import type { AgentEvent } from '../types.js';

import { sortTasksDeterministically } from '../orchestrator/agent-orchestrator.js';

export interface ReplayPlanItem {
  task_id: string;
  agent_name: string;
}

export interface ReplayReport {
  run_id: string | null;
  plan: ReplayPlanItem[];
  divergence: string[];
}

const parseEventLog = (jsonl: string): { events: AgentEvent[]; parseErrors: string[] } => {
  const events: AgentEvent[] = [];
  const parseErrors: string[] = [];

  for (const [index, rawLine] of jsonl.split('\n').entries()) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }

    try {
      events.push(JSON.parse(line) as AgentEvent);
    } catch {
      parseErrors.push(`Invalid JSONL at line ${index + 1}`);
    }
  }

  return { events, parseErrors };
};

export const replayRun = (jsonl: string): ReplayReport => {
  const { events, parseErrors } = parseEventLog(jsonl);
  const runEvents = events.filter((event) => event.type !== 'LOG_WRITE_FAILED');
  const runIds = new Set(runEvents.map((event) => event.run_id).filter(Boolean));

  const enqueued = runEvents
    .filter((event) => event.type === 'TASK_ENQUEUED' && event.task_id)
    .map((event) => ({
      id: event.task_id as string,
      priority: Number(event.metadata.priority ?? 0),
      created_at: String(event.metadata.created_at ?? ''),
      type: 'replay-task',
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

  const divergence: string[] = [...parseErrors];
  if (runIds.size > 1) {
    divergence.push(`Run ID divergence: expected 1 run_id, found ${runIds.size}`);
  }

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
    run_id: runIds.size === 1 ? Array.from(runIds)[0] : null,
    plan: agentSelections,
    divergence,
  };
};
