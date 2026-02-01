import { describe, it, expect } from 'vitest';
import { generateRunId } from './runid.js';

describe('runid', () => {
  it('should generate a valid UUIDv7', () => {
    const runId = generateRunId();
    expect(runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate time-ordered UUIDs', async () => {
    const id1 = generateRunId();
    // Wait a bit to ensure a different millisecond if needed,
    // although UUIDv7 should be ordered even within same ms if implemented correctly with counter
    await new Promise(resolve => setTimeout(resolve, 2));
    const id2 = generateRunId();
    expect(id2 > id1).toBe(true);
  });
});
