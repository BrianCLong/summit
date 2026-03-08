import { appendFileSync } from 'node:fs';

import type { AgentEvent } from '../types.js';

export interface EventLogAppendResult {
  ok: boolean;
  errorEvent?: AgentEvent;
}

export class EventLogWriter {
  private readonly events: AgentEvent[] = [];

  append(event: AgentEvent): EventLogAppendResult {
    this.events.push(event);

    if (process.env.NODE_ENV === 'test' || !process.env.LOG_PATH) {
      return { ok: true };
    }

    try {
      appendFileSync(process.env.LOG_PATH, `${JSON.stringify(event)}\n`, 'utf8');
      return { ok: true };
    } catch (error) {
      const errorEvent: AgentEvent = {
        run_id: event.run_id,
        task_id: event.task_id,
        agent_name: event.agent_name,
        ts: new Date().toISOString(),
        type: 'LOG_WRITE_FAILED',
        inputs_hash: event.inputs_hash,
        outputs_hash: null,
        attempt: event.attempt,
        status: 'failed',
        metadata: {
          reason: 'Event log write failure was constrained',
          error: error instanceof Error ? error.message : String(error),
          original_type: event.type,
        },
      };
      this.events.push(errorEvent);
      return { ok: false, errorEvent };
    }
  }

  flushToString(): string {
    return this.events.map((event) => JSON.stringify(event)).join('\n');
  }

  getEvents(): AgentEvent[] {
    return [...this.events];
  }
}
