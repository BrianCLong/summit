import { queue, worker } from '../src/worker.js';

describe('worker bootstrap', () => {
  afterAll(async () => {
    await worker.close();
    await queue.close();
  });

  it('registers queue with correct name', () => {
    expect(queue.name).toBe('{{SERVICE_SLUG}}');
  });
});
