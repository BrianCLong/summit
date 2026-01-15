import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PlaybookExecutor } from '../executor.js';
import { Playbook } from '../schema.js';

describe('PlaybookExecutor', () => {
  it('executes steps in order', async () => {
    const order: string[] = [];

    const executor = new PlaybookExecutor({
      log: async (step) => {
        order.push(step.id);
        return { message: step.message };
      },
      delay: async (step) => {
        order.push(step.id);
        return { durationMs: step.durationMs };
      },
    });

    const playbook: Playbook = {
      id: 'pb-1',
      name: 'Sample',
      steps: [
        { id: 'step-1', type: 'log', message: 'hello' },
        { id: 'step-2', type: 'delay', durationMs: 5 },
      ],
    };

    const results = await executor.execute(playbook);

    expect(order).toEqual(['step-1', 'step-2']);
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('success');
    expect(results[1].status).toBe('success');
  });
});
