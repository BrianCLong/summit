import { describe, it, expect } from 'vitest';
import { OpenLineageClient } from './event.js';
import { validateEvent } from './validate.js';

describe('OpenLineageClient', () => {
  it('should create a valid event', () => {
    const client = new OpenLineageClient('http://producer.com');
    const event = client.createRunEvent({
      eventType: 'START',
      job: { namespace: 'ns', name: 'job' },
      runId: '123e4567-e89b-12d3-a456-426614174000'
    });

    expect(event.eventType).toBe('START');
    expect(event.run.runId).toBe('123e4567-e89b-12d3-a456-426614174000');

    const result = validateEvent(event);
    expect(result.success).toBe(true);
  });
});
