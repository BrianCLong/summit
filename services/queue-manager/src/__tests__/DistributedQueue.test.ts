/**
 * Distributed Queue Test Suite
 *
 * Comprehensive tests for the distributed queue system including:
 * - Redis cluster client with failover
 * - Distributed queue operations
 * - Agent fleet notifications
 * - Air-gapped failover
 * - Codex task orchestration
 * - E2E testing hooks
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock Redis/ioredis
const mockRedisClient = {
  ping: jest.fn().mockResolvedValue('PONG'),
  quit: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  on: jest.fn(),
  subscribe: jest.fn().mockResolvedValue(undefined),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue(1),
  hset: jest.fn().mockResolvedValue(1),
  hget: jest.fn().mockResolvedValue(null),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
};

jest.mock('ioredis', () => {
  return {
    default: jest.fn().mockImplementation(() => mockRedisClient),
    __esModule: true,
  };
});

// Mock BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation((name) => ({
    name,
    add: jest.fn().mockResolvedValue({ id: 'job-1', name: 'test-job', data: {} }),
    addBulk: jest.fn().mockResolvedValue([{ id: 'job-1' }, { id: 'job-2' }]),
    getJob: jest.fn().mockResolvedValue(null),
    getJobs: jest.fn().mockResolvedValue([]),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    }),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation((name, processor, opts) => ({
    name,
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  QueueEvents: jest.fn().mockImplementation((name) => ({
    name,
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  FlowProducer: jest.fn().mockImplementation(() => ({
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Job: jest.fn(),
}));

// Import after mocks
import {
  RedisClusterClient,
  RedisClusterConfig,
  DistributedPriority,
} from '../distributed/index.js';

describe('RedisClusterClient', () => {
  let client: RedisClusterClient;
  const config: RedisClusterConfig = {
    nodes: [
      { host: 'localhost', port: 6379, role: 'primary' },
      { host: 'localhost', port: 6380, role: 'replica' },
    ],
    poolSize: 5,
    minPoolSize: 2,
    maxPoolSize: 10,
    healthCheckInterval: 1000,
  };

  beforeEach(() => {
    client = new RedisClusterClient(config);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await client.shutdown();
  });

  describe('initialization', () => {
    it('should create client with provided config', () => {
      expect(client).toBeDefined();
      expect(client.getActiveNode()).toBeNull();
    });

    it('should have correct default config values', () => {
      const minimalClient = new RedisClusterClient({
        nodes: [{ host: 'localhost', port: 6379, role: 'primary' }],
      });
      expect(minimalClient).toBeDefined();
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics', () => {
      const stats = client.getPoolStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('idle');
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('healthyNodes');
      expect(stats).toHaveProperty('unhealthyNodes');
    });
  });

  describe('getNodeHealthStatus', () => {
    it('should return health status for all nodes', () => {
      const health = client.getNodeHealthStatus();

      expect(health.size).toBe(config.nodes.length);
    });
  });

  describe('getFailoverHistory', () => {
    it('should return empty history initially', () => {
      const history = client.getFailoverHistory();

      expect(history).toEqual([]);
    });
  });

  describe('isAirgapped', () => {
    it('should return false when not in airgap mode', () => {
      expect(client.isAirgapped()).toBe(false);
    });
  });
});

describe('DistributedPriority', () => {
  it('should have correct priority values', () => {
    expect(DistributedPriority.CRITICAL).toBe(1);
    expect(DistributedPriority.URGENT).toBe(2);
    expect(DistributedPriority.HIGH).toBe(3);
    expect(DistributedPriority.NORMAL).toBe(5);
    expect(DistributedPriority.LOW).toBe(7);
    expect(DistributedPriority.BACKGROUND).toBe(10);
  });

  it('should have CRITICAL as highest priority', () => {
    expect(DistributedPriority.CRITICAL).toBeLessThan(DistributedPriority.HIGH);
    expect(DistributedPriority.HIGH).toBeLessThan(DistributedPriority.NORMAL);
    expect(DistributedPriority.NORMAL).toBeLessThan(DistributedPriority.LOW);
    expect(DistributedPriority.LOW).toBeLessThan(DistributedPriority.BACKGROUND);
  });
});

describe('AgentFleetNotifier', () => {
  // Import dynamically to avoid issues with mocks
  let AgentFleetNotifier: any;
  let notifier: any;
  let mockRedisClusterClient: any;

  beforeEach(async () => {
    const module = await import('../notifications/index.js');
    AgentFleetNotifier = module.AgentFleetNotifier;

    mockRedisClusterClient = {
      acquire: jest.fn().mockResolvedValue(mockRedisClient),
      release: jest.fn(),
    };

    notifier = new AgentFleetNotifier(mockRedisClusterClient, {
      heartbeatInterval: 1000,
      heartbeatTimeout: 3000,
    });
  });

  afterEach(async () => {
    await notifier.stop();
  });

  describe('agent management', () => {
    it('should register an agent', async () => {
      await notifier.start();

      const agent = await notifier.registerAgent({
        id: 'agent-1',
        fleetId: 'fleet-1',
        name: 'Test Agent',
        status: 'online',
        capabilities: ['task-processing'],
        maxConcurrency: 10,
        currentLoad: 0,
      });

      expect(agent.id).toBe('agent-1');
      expect(agent.fleetId).toBe('fleet-1');
      expect(agent.lastHeartbeat).toBeDefined();
    });

    it('should get agent info', async () => {
      await notifier.start();

      await notifier.registerAgent({
        id: 'agent-2',
        fleetId: 'fleet-1',
        name: 'Test Agent 2',
        status: 'online',
        capabilities: [],
        maxConcurrency: 5,
        currentLoad: 0,
      });

      const agent = notifier.getAgent('agent-2');
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('Test Agent 2');
    });

    it('should return undefined for non-existent agent', () => {
      const agent = notifier.getAgent('non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('fleet management', () => {
    it('should get all fleets', async () => {
      await notifier.start();

      await notifier.registerAgent({
        id: 'agent-3',
        fleetId: 'fleet-2',
        name: 'Test Agent 3',
        status: 'online',
        capabilities: [],
        maxConcurrency: 5,
        currentLoad: 0,
      });

      const fleets = notifier.getFleets();
      expect(fleets.length).toBeGreaterThan(0);
    });

    it('should calculate fleet health', async () => {
      await notifier.start();

      await notifier.registerAgent({
        id: 'agent-4',
        fleetId: 'fleet-3',
        name: 'Test Agent 4',
        status: 'online',
        capabilities: [],
        maxConcurrency: 10,
        currentLoad: 5,
      });

      const health = notifier.calculateFleetHealth('fleet-3');
      expect(health).toBeGreaterThanOrEqual(0);
      expect(health).toBeLessThanOrEqual(100);
    });
  });
});

describe('CodexTaskOrchestrator', () => {
  let CodexTaskOrchestrator: any;
  let orchestrator: any;
  let mockDistributedQueue: any;

  beforeEach(async () => {
    const module = await import('../orchestration/index.js');
    CodexTaskOrchestrator = module.CodexTaskOrchestrator;

    mockDistributedQueue = {
      addJob: jest.fn().mockResolvedValue({
        id: 'job-1',
        name: 'codex-task',
        status: 'waiting',
      }),
      getJob: jest.fn().mockResolvedValue(null),
      on: jest.fn(),
    };

    orchestrator = new CodexTaskOrchestrator(mockDistributedQueue, {
      defaultMaxParallel: 3,
      defaultTimeout: 5000,
      rateLimitMax: 10,
      rateLimitWindow: 1000,
    });
  });

  describe('task submission', () => {
    it('should submit a task', async () => {
      const task = await orchestrator.submitTask(
        'code-generation',
        { prompt: 'Generate a hello world function' },
        { model: 'gpt-4' },
      );

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.type).toBe('code-generation');
      expect(task.status).toBe('queued');
    });

    it('should submit a batch of tasks', async () => {
      const batch = await orchestrator.submitBatch([
        { type: 'code-generation', input: { prompt: 'Task 1' } },
        { type: 'code-review', input: { prompt: 'Task 2' } },
      ]);

      expect(batch).toBeDefined();
      expect(batch.id).toBeDefined();
      expect(batch.tasks.length).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should return orchestrator stats', () => {
      const stats = orchestrator.getStats();

      expect(stats).toHaveProperty('activeTasks');
      expect(stats).toHaveProperty('completedTasks');
      expect(stats).toHaveProperty('failedTasks');
      expect(stats).toHaveProperty('totalBatches');
      expect(stats).toHaveProperty('tokenUsage');
      expect(stats).toHaveProperty('rateLimitRemaining');
    });

    it('should track token usage', () => {
      const usage = orchestrator.getTokenUsage();

      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('budget');
      expect(usage).toHaveProperty('remaining');
      expect(usage).toHaveProperty('estimatedCost');
    });

    it('should reset token usage', () => {
      orchestrator.resetTokenUsage();
      const usage = orchestrator.getTokenUsage();

      expect(usage.used).toBe(0);
    });
  });
});

describe('E2ETestingHooks', () => {
  let E2ETestingHooks: any;
  let hooks: any;

  beforeEach(async () => {
    const module = await import('../e2e/index.js');
    E2ETestingHooks = module.E2ETestingHooks;

    hooks = new E2ETestingHooks({
      enabled: true,
      latencySimulation: { min: 10, max: 100, distribution: 'uniform' },
      errorInjection: { rate: 0.1, types: ['timeout', 'network'] },
    });
  });

  describe('test suite management', () => {
    it('should create a test suite', () => {
      const suite = hooks.createSuite('Integration Tests');

      expect(suite).toBeDefined();
      expect(suite.id).toBeDefined();
      expect(suite.name).toBe('Integration Tests');
      expect(suite.status).toBe('pending');
    });

    it('should add tests to a suite', () => {
      const suite = hooks.createSuite('Test Suite');
      const test = hooks.addTest(suite.id, 'should pass', async () => {});

      expect(test).toBeDefined();
      expect(test.name).toBe('should pass');
      expect(test.status).toBe('pending');
    });

    it('should run a test suite', async () => {
      const suite = hooks.createSuite('Runnable Suite');
      hooks.addTest(suite.id, 'passing test', async () => {
        // Test passes
      });

      const result = await hooks.runSuite(suite.id);

      expect(result.status).toBe('passed');
      expect(result.tests[0].status).toBe('passed');
    });

    it('should handle failing tests', async () => {
      const suite = hooks.createSuite('Failing Suite');
      hooks.addTest(suite.id, 'failing test', async () => {
        throw new Error('Test failed');
      });

      const result = await hooks.runSuite(suite.id);

      expect(result.status).toBe('failed');
      expect(result.tests[0].status).toBe('failed');
      expect(result.tests[0].error).toBeDefined();
    });
  });

  describe('job capture', () => {
    it('should capture jobs', () => {
      const mockJob = {
        id: 'captured-job-1',
        name: 'test',
        status: 'completed',
        partition: 'default',
      };

      hooks.captureJob(mockJob as any);
      const captured = hooks.getCapturedJobs();

      expect(captured.length).toBe(1);
      expect(captured[0].id).toBe('captured-job-1');
    });

    it('should filter captured jobs', () => {
      hooks.captureJob({ id: '1', name: 'type-a', status: 'completed' } as any);
      hooks.captureJob({ id: '2', name: 'type-b', status: 'failed' } as any);
      hooks.captureJob({ id: '3', name: 'type-a', status: 'completed' } as any);

      const typeAJobs = hooks.getCapturedJobs({ name: 'type-a' });
      const failedJobs = hooks.getCapturedJobs({ status: 'failed' });

      expect(typeAJobs.length).toBe(2);
      expect(failedJobs.length).toBe(1);
    });

    it('should clear captured jobs', () => {
      hooks.captureJob({ id: '1' } as any);
      hooks.clearCapturedJobs();

      expect(hooks.getCapturedJobs().length).toBe(0);
    });
  });

  describe('assertions', () => {
    it('should assert job completed', () => {
      hooks.captureJob({ id: 'job-1', status: 'completed' } as any);
      const assertion = hooks.assertJobCompleted('job-1');

      expect(assertion.passed).toBe(true);
    });

    it('should fail assertion for non-completed job', () => {
      hooks.captureJob({ id: 'job-2', status: 'failed' } as any);
      const assertion = hooks.assertJobCompleted('job-2');

      expect(assertion.passed).toBe(false);
    });

    it('should assert job count', () => {
      hooks.captureJob({ id: '1' } as any);
      hooks.captureJob({ id: '2' } as any);

      const assertion = hooks.assertJobCount(2);
      expect(assertion.passed).toBe(true);
    });
  });

  describe('event capture', () => {
    it('should capture events', () => {
      hooks.captureEvent('test:event', { key: 'value' });
      const events = hooks.getCapturedEvents();

      expect(events.length).toBe(1);
      expect(events[0].type).toBe('test:event');
      expect(events[0].data.key).toBe('value');
    });

    it('should filter events by type', () => {
      hooks.captureEvent('type-a', {});
      hooks.captureEvent('type-b', {});
      hooks.captureEvent('type-a', {});

      const typeAEvents = hooks.getCapturedEvents('type-a');
      expect(typeAEvents.length).toBe(2);
    });
  });

  describe('metrics', () => {
    it('should return test metrics', () => {
      const metrics = hooks.getMetrics();

      expect(metrics).toHaveProperty('jobsProcessed');
      expect(metrics).toHaveProperty('avgLatency');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('failoverCount');
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      hooks.captureJob({ id: '1' } as any);
      hooks.captureEvent('test', {});
      hooks.setMockResponse('job-1', { result: 'mocked' });

      hooks.reset();

      expect(hooks.getCapturedJobs().length).toBe(0);
      expect(hooks.getCapturedEvents().length).toBe(0);
      expect(hooks.getMockResponse('job-1')).toBeUndefined();
    });
  });
});

describe('AirgapFailoverOrchestrator', () => {
  let AirgapFailoverOrchestrator: any;
  let orchestrator: any;
  let mockRedisClusterClient: any;

  beforeEach(async () => {
    const module = await import('../distributed/index.js');
    AirgapFailoverOrchestrator = module.AirgapFailoverOrchestrator;

    mockRedisClusterClient = {
      execute: jest.fn().mockResolvedValue('PONG'),
      acquire: jest.fn().mockResolvedValue(mockRedisClient),
      release: jest.fn(),
    };

    orchestrator = new AirgapFailoverOrchestrator(mockRedisClusterClient, {
      enabled: true,
      localStoragePath: '/tmp/test-airgap',
      maxLocalQueueSize: 100,
      syncBatchSize: 10,
    });
  });

  describe('status', () => {
    it('should return current status', () => {
      const status = orchestrator.getStatus();

      expect(status).toHaveProperty('state');
      expect(status).toHaveProperty('pendingJobs');
      expect(status).toHaveProperty('localQueueSize');
    });

    it('should start in connected state', () => {
      const status = orchestrator.getStatus();
      expect(status.state).toBe('connected');
    });
  });

  describe('local queue stats', () => {
    it('should return local queue statistics', () => {
      const stats = orchestrator.getLocalQueueStats();

      expect(stats).toHaveProperty('totalJobs');
      expect(stats).toHaveProperty('pendingSync');
      expect(stats).toHaveProperty('syncedJobs');
      expect(stats).toHaveProperty('oldestJob');
    });
  });
});
