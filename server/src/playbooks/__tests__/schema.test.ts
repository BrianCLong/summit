import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PlaybookRunSchema, PlaybookSchema } from '../schema.js';

describe('Playbook schema', () => {
  it('accepts a valid playbook', () => {
    const result = PlaybookSchema.safeParse({
      id: 'pb-1',
      name: 'Sample',
      steps: [
        { id: 'step-1', type: 'log', message: 'hello' },
        { id: 'step-2', type: 'delay', durationMs: 10 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid steps', () => {
    const result = PlaybookSchema.safeParse({
      id: 'pb-1',
      name: 'Sample',
      steps: [{ id: 'step-1', type: 'unknown' }],
    });

    expect(result.success).toBe(false);
  });

  it('requires a run key for playbook runs', () => {
    const result = PlaybookRunSchema.safeParse({
      playbook: {
        id: 'pb-1',
        name: 'Sample',
        steps: [{ id: 'step-1', type: 'log', message: 'hello' }],
      },
    });

    expect(result.success).toBe(false);
  });
});
