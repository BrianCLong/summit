import { InMemoryTaskQueue } from '../../platform/maestro-core/queue-memory.js';
import { MaestroScheduler } from '../../platform/maestro-core/scheduler.js';
import { SLOEvaluationEngine } from '../../platform/summitsight/engine.js';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Maestro Priority Scheduler', () => {
  let queue: InMemoryTaskQueue;
  let scheduler: MaestroScheduler;
  let mockSLOEngine: any;

  beforeEach(() => {
    queue = new InMemoryTaskQueue();
    // Mock the SLO engine
    mockSLOEngine = {
        evaluate: jest.fn()
    } as any;
    scheduler = new MaestroScheduler(queue, mockSLOEngine);
  });

  test('should process CRITICAL tasks before LOW priority tasks', async () => {
    await scheduler.scheduleTask({
      tenantId: 't1',
      type: 'low-job',
      payload: {},
      priority: 'LOW',
      maxAttempts: 3
    });

    await scheduler.scheduleTask({
      tenantId: 't1',
      type: 'crit-job',
      payload: {},
      priority: 'CRITICAL',
      maxAttempts: 3
    });

    const task1 = await scheduler.processNext(['low-job', 'crit-job']);
    expect(task1?.priority).toBe('CRITICAL');

    const task2 = await scheduler.processNext(['low-job', 'crit-job']);
    expect(task2?.priority).toBe('LOW');
  });

  test('should enforce SLA expiration check', async () => {
    const task = await scheduler.scheduleTask({
      tenantId: 't1',
      type: 'sla-job',
      payload: {},
      priority: 'NORMAL',
      slaSeconds: 1,
      maxAttempts: 3
    });

    expect(scheduler.checkSLACompliance(task)).toBe(true);

    // Simulate time passing
    task.createdAt = new Date(Date.now() - 2000);
    expect(scheduler.checkSLACompliance(task)).toBe(false);
  });

  test('should evaluate SLO when processing task', async () => {
    await scheduler.scheduleTask({
        tenantId: 't1',
        type: 'test-job',
        payload: {},
        priority: 'NORMAL',
        maxAttempts: 3
    });

    await scheduler.processNext(['test-job']);
    expect(mockSLOEngine.evaluate).toHaveBeenCalledWith(expect.any(Number), 'maestro-task-queue-latency');
  });
});
