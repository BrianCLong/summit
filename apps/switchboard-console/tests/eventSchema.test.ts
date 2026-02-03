import { describe, expect, it } from 'vitest';
import { validateEventRecord } from '../src/logging/eventSchema';
import { EventRecord } from '../src/types';

describe('event schema validation', () => {
  it('accepts valid event records', () => {
    const record: EventRecord = {
      id: 'event-1',
      type: 'session_start',
      timestamp: new Date().toISOString(),
      sessionId: 'session-1',
      data: { resume: false },
    };

    expect(validateEventRecord(record)).toBe(true);
  });

  it('rejects invalid event types', () => {
    const record = {
      id: 'event-2',
      type: 'unknown',
      timestamp: new Date().toISOString(),
      sessionId: 'session-2',
      data: {},
    } as EventRecord;

    expect(validateEventRecord(record)).toBe(false);
  });
});
