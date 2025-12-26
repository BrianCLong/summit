
import { jest } from '@jest/globals';
import { MaestroEngine } from '../src/maestro/engine.js';
import { OutcomeMetrics } from '../src/lib/telemetry/outcome-metrics.js';

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    close: jest.fn(),
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

// Mock OutcomeMetrics
jest.mock('../src/lib/telemetry/outcome-metrics.js', () => ({
  OutcomeMetrics: {
    recordWorkflowOutcome: jest.fn(),
  },
}));

describe('Maestro Outcome Metrics', () => {
  let engine: MaestroEngine;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    mockDb = {
      connect: jest.fn(),
      query: jest.fn(),
      release: jest.fn(),
    };
    mockRedis = {};

    engine = new MaestroEngine({
      db: mockDb,
      redisConnection: mockRedis,
    });
  });

  it('should record outcome metric when run completes successfully', async () => {
    const runId = 'test-run-1';

    // Mock DB responses to simulate:
    // 1. checkRunCompletion query 1 (count non-terminal tasks) -> 0 (all done)
    // 2. checkRunCompletion query 2 (count failed tasks) -> 0 (none failed)
    // 3. update run status
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // checkRunCompletion: remaining tasks
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // checkRunCompletion: failed tasks
      .mockResolvedValueOnce({ rows: [] }); // Update run status

    // We need to trigger checkRunCompletion.
    // It's private, but called by evaluateDependents, which is private.
    // However, processTask calls evaluateDependents.
    // But processTask is also private.
    // The public entry point is usually the worker, but we mocked the worker.

    // We can cast engine to any to access private methods for testing purpose,
    // or better, verify the logic via unit test of checkRunCompletion if we could call it.

    // Let's rely on the fact that checkRunCompletion is called internally.
    // In this specific test, to avoid setting up the whole state machine,
    // I will use `(engine as any).checkRunCompletion(runId)` to verify the logic at that specific point.

    await (engine as any).checkRunCompletion(runId);

    expect(OutcomeMetrics.recordWorkflowOutcome).toHaveBeenCalledWith(runId, true);
  });

  it('should record outcome failure when run fails', async () => {
    const runId = 'test-run-2';

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // checkRunCompletion: remaining tasks
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // checkRunCompletion: failed tasks (1 failed)
      .mockResolvedValueOnce({ rows: [] }); // Update run status

    await (engine as any).checkRunCompletion(runId);

    expect(OutcomeMetrics.recordWorkflowOutcome).toHaveBeenCalledWith(runId, false);
  });
});
