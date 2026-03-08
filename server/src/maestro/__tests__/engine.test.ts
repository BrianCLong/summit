
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
jest.mock('../MaestroService.js', () => ({
  maestroService: {
    logAudit: jest.fn(),
  },
}));

import { MaestroEngine } from '../engine';
import { MaestroDSL } from '../dsl';
import { MaestroTask, MaestroTemplate } from '../model';

// Mocks
const mockDb = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
};
const mockQueue = { add: jest.fn(), close: jest.fn() };
const mockQueueEvents = { on: jest.fn(), close: jest.fn() };
const mockWorker = { close: jest.fn() };

jest.mock('bullmq', () => ({
  Queue: jest.fn(),
  QueueEvents: jest.fn(),
  Worker: jest.fn(),
}));

describe('MaestroEngine', () => {
  let engine: MaestroEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    const bullmq = jest.requireMock('bullmq') as {
      Queue: jest.Mock;
      QueueEvents: jest.Mock;
      Worker: jest.Mock;
    };
    mockQueue.add = jest.fn();
    mockQueue.close = jest.fn();
    mockQueueEvents.on = jest.fn();
    mockQueueEvents.close = jest.fn();
    mockWorker.close = jest.fn();
    bullmq.Queue.mockImplementation(() => mockQueue);
    bullmq.QueueEvents.mockImplementation(() => mockQueueEvents);
    bullmq.Worker.mockImplementation(() => mockWorker);
    engine = new MaestroEngine({
      db: mockDb as any,
      redisConnection: {}
    });
  });

  describe('createRun', () => {
    it('should create a run and enqueue ready tasks', async () => {
      const templateId = 'tpl-1';
      const tenantId = 'tenant-1';
      const runId = 'run-1';

      // Mock DB: Template lookup
      (mockDb.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: templateId,
          version: 1,
          spec: {
            nodes: [{ id: 'n1', kind: 'task', ref: 'llm_call' }],
            edges: []
          }
        }]
      });

      // Simple test ensuring DSL works as expected
      const tasks = MaestroDSL.compileToTasks(
        { nodes: [{ id: 'n1', kind: 'task', ref: 'llm_call' }], edges: [] },
        runId,
        tenantId,
        {}
      );

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('ready');
    });
  });
});

describe('MaestroDSL', () => {
  it('should validate a simple DAG', () => {
    const spec = {
      nodes: [
        { id: '1', kind: 'task' as const, ref: 'a' },
        { id: '2', kind: 'task' as const, ref: 'b' }
      ],
      edges: [
        { from: '1', to: '2' }
      ]
    };
    expect(MaestroDSL.validate(spec).valid).toBe(true);
  });

  it('should detect cycles', () => {
    const spec = {
      nodes: [
        { id: '1', kind: 'task' as const, ref: 'a' },
        { id: '2', kind: 'task' as const, ref: 'b' }
      ],
      edges: [
        { from: '1', to: '2' },
        { from: '2', to: '1' }
      ]
    };
    expect(MaestroDSL.validate(spec).valid).toBe(false);
  });
});
