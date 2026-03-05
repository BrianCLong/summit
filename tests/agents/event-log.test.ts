import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { EventLogWriter } from '../../summit/agents/logging/event-log.js';
import type { AgentEvent } from '../../summit/agents/types.js';

const makeEvent = (): AgentEvent => ({
  run_id: 'run-1',
  task_id: 'task-1',
  agent_name: 'agent-1',
  ts: '2026-01-01T00:00:00.000Z',
  type: 'RUN_STARTED',
  inputs_hash: null,
  outputs_hash: null,
  attempt: null,
  status: 'started',
  metadata: {},
});

describe('EventLogWriter', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLogPath = process.env.LOG_PATH;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.LOG_PATH = originalLogPath;
  });

  it('writes JSONL lines in memory', () => {
    process.env.NODE_ENV = 'test';
    const writer = new EventLogWriter();

    writer.append(makeEvent());
    writer.append({ ...makeEvent(), type: 'RUN_FINISHED', task_id: null });

    const lines = writer.flushToString().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).type).toBe('RUN_STARTED');
    expect(JSON.parse(lines[1]).type).toBe('RUN_FINISHED');
  });

  it('writes to file when LOG_PATH is set and NODE_ENV is not test', () => {
    process.env.NODE_ENV = 'development';
    const dir = mkdtempSync(join(tmpdir(), 'event-log-'));
    const path = join(dir, 'events.jsonl');
    process.env.LOG_PATH = path;

    const writer = new EventLogWriter();
    writer.append(makeEvent());

    const content = readFileSync(path, 'utf8').trim();
    expect(JSON.parse(content).run_id).toBe('run-1');
  });
});
