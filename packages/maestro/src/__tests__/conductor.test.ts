import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Conductor, Job } from '../conductor.js';

describe('Maestro Conductor', () => {
  let conductor: Conductor;

  beforeEach(() => {
    conductor = new Conductor();
    vi.useFakeTimers();
  });

  it('should enqueue and execute jobs', async () => {
    const handler = vi.fn().mockResolvedValue('ok');
    const job: Job = {
      id: 'j1',
      type: 'test',
      payload: { data: 1 },
      priority: 1,
      handler
    };

    conductor.enqueue(job);
    expect(conductor.getStatus('j1')).toBe('queued');

    const executePromise = conductor.execute('j1');
    vi.runAllTimers();
    const result = await executePromise;

    expect(result.output).toBe('ok');
    expect(conductor.getStatus('j1')).toBe('completed');
    expect(handler).toHaveBeenCalledWith({ data: 1 });
  });

  it('should respect priority', async () => {
    const conductor = new Conductor();
    const jobLow: Job = { id: 'low', type: 't', payload: {}, priority: 2, handler: async () => {} };
    const jobHigh: Job = { id: 'high', type: 't', payload: {}, priority: 0, handler: async () => {} };

    conductor.enqueue(jobLow);
    conductor.enqueue(jobHigh);

    // Internal queue should be sorted
    expect((conductor as any).queue[0].id).toBe('high');
    expect((conductor as any).queue[1].id).toBe('low');
  });

  it('should handle timeouts', async () => {
    const handler = () => new Promise(resolve => setTimeout(() => resolve('late'), 1000));
    const job: Job = {
      id: 'timeout-job',
      type: 'test',
      payload: {},
      priority: 1,
      timeoutMs: 500,
      retries: 0,
      handler
    };

    conductor.enqueue(job);
    const executePromise = conductor.execute('timeout-job');

    vi.advanceTimersByTime(600);
    await expect(executePromise).rejects.toThrow('Timeout');
    expect(conductor.getStatus('timeout-job')).toBe('failed');
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const handler = async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    };

    const job: Job = {
      id: 'retry-job',
      type: 'test',
      payload: {},
      priority: 1,
      retries: 2,
      handler
    };

    conductor.enqueue(job);
    const executePromise = conductor.execute('retry-job');

    // Attempt 1 fails
    await vi.runOnlyPendingTimersAsync();
    // Attempt 2 fails
    await vi.runOnlyPendingTimersAsync();
    // Attempt 3 succeeds
    await vi.runOnlyPendingTimersAsync();

    const result = await executePromise;
    expect(result.output).toBe('success');
    expect(result.attempt).toBe(3);
  });
});
