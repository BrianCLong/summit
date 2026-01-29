import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { appendEvent } from '../src/eventlog/append.js';
import { replayEvents } from '../src/eventlog/replay.js';
import { verifyEventChain } from '../src/eventlog/verify.js';
import { OrchestratorEvent } from '../src/types.js';

const TEST_LOG = path.join(process.cwd(), 'packages/orchestrator/test/test-event.log');

describe('EventLog', () => {
  beforeEach(async () => {
    await fs.remove(TEST_LOG);
    await fs.ensureDir(path.dirname(TEST_LOG));
  });

  afterEach(async () => {
    await fs.remove(TEST_LOG);
  });

  it('should append and replay events deterministically', async () => {
    const event1: OrchestratorEvent = {
      evidence_id: 'EVID-1',
      type: 'TASK_CREATED',
      team_id: 'team-a',
      payload: { foo: 'bar' }
    };
    const event2: OrchestratorEvent = {
      evidence_id: 'EVID-2',
      type: 'TASK_COMPLETED',
      team_id: 'team-a',
      payload: { result: 'ok' }
    };

    await appendEvent(TEST_LOG, event1);
    await appendEvent(TEST_LOG, event2);

    const events = await replayEvents(TEST_LOG);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual(event1);
    expect(events[1]).toEqual(event2);
  });

  it('should verify unique evidence ids', () => {
    const events: OrchestratorEvent[] = [
      { evidence_id: '1', type: 'a', team_id: 't', payload: {} },
      { evidence_id: '2', type: 'b', team_id: 't', payload: {} }
    ];
    expect(verifyEventChain(events)).toBe(true);

    const dupEvents: OrchestratorEvent[] = [
      { evidence_id: '1', type: 'a', team_id: 't', payload: {} },
      { evidence_id: '1', type: 'b', team_id: 't', payload: {} }
    ];
    expect(verifyEventChain(dupEvents)).toBe(false);
  });
});
