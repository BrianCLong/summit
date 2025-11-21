import { runManager } from '../../orchestrator/runManager';
import { recordRunInIntelGraph } from '../../orchestrator/intelGraphIntegration';
import { AgentTask, maestro } from '../../orchestrator/maestro';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';

// Mocking external dependencies
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      close: jest.fn(),
    })),
    Worker: jest.fn().mockImplementation(() => ({
      close: jest.fn(),
    })),
    QueueEvents: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
    })),
  };
});

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    quit: jest.fn(),
  }));
});

// Mock IntelGraph integration
jest.mock('../../orchestrator/intelGraphIntegration', () => ({
  recordRunInIntelGraph: jest.fn(),
}));

describe('Maestro Orchestrator & RunManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset runManager state if possible, or we rely on unique IDs
    // Since RunManager is a singleton with private state, we can't easily reset it without exposing a method.
    // For now, we rely on unique IDs.
  });

  afterAll(async () => {
    await maestro.shutdown();
  });

  it('should create a run when enqueuing a task', async () => {
    const task: AgentTask = {
      kind: 'plan',
      repo: 'test-repo',
      issue: 'issue-123',
      budgetUSD: 10,
      context: {},
      metadata: {
        actor: 'test-user',
        timestamp: new Date().toISOString(),
        sprint_version: 'v1',
      },
    };

    const jobId = await maestro.enqueueTask(task);
    expect(jobId).toBeDefined();

    // Verify a run was created (we can't access the run ID directly from enqueueTask easily unless we look at calls)
    // But we can check if recordRunInIntelGraph was called
    expect(recordRunInIntelGraph).toHaveBeenCalled();
  });

  it('should handle idempotency correctly', async () => {
    const idempotencyKey = uuidv4();
    const task: AgentTask = {
      kind: 'scaffold',
      repo: 'test-repo',
      issue: 'issue-124',
      budgetUSD: 10,
      context: {},
      idempotencyKey,
      metadata: {
        actor: 'test-user',
        timestamp: new Date().toISOString(),
        sprint_version: 'v1',
      },
    };

    // First call
    await maestro.enqueueTask(task);
    const firstRunCreateCalls = (recordRunInIntelGraph as jest.Mock).mock.calls.length;

    // Second call with same idempotency key
    await maestro.enqueueTask(task);

    // Ideally, we should verify that we got the SAME run ID back or handled it gracefully.
    // Our current implementation creates a run in RunManager but logs if it exists.
    // Let's check if RunManager returns the same run object instance for the same key.

    // We can test RunManager directly for this:
    const run1 = await runManager.createRun({
        type: 'scaffold',
        input: {},
        metadata: { actor: 'test' },
        idempotencyKey: 'key-1'
    });

    const run2 = await runManager.createRun({
        type: 'scaffold',
        input: {},
        metadata: { actor: 'test' },
        idempotencyKey: 'key-1'
    });

    expect(run1.id).toBe(run2.id);
  });

  it('should manage run lifecycle', async () => {
    const run = await runManager.createRun({
      type: 'test',
      input: { foo: 'bar' },
      metadata: { actor: 'tester' }
    });

    expect(run.status).toBe('queued');
    expect(run.createdAt).toBeDefined();

    await runManager.updateStatus(run.id, 'running');
    const runningRun = await runManager.getRun(run.id);
    expect(runningRun?.status).toBe('running');
    expect(runningRun?.startedAt).toBeDefined();

    await runManager.completeRun(run.id, { result: 'success' });
    const completedRun = await runManager.getRun(run.id);
    expect(completedRun?.status).toBe('succeeded');
    expect(completedRun?.completedAt).toBeDefined();
    expect(completedRun?.output).toEqual({ result: 'success' });
  });

  it('should track artifacts', async () => {
    const run = await runManager.createRun({
        type: 'docs',
        input: {},
        metadata: { actor: 'doc-bot' }
    });

    await runManager.addArtifact(run.id, {
        id: 'art-1',
        name: 'README.md',
        type: 'file',
        location: '/tmp/README.md'
    });

    const updatedRun = await runManager.getRun(run.id);
    expect(updatedRun?.artifacts).toHaveLength(1);
    expect(updatedRun?.artifacts[0].name).toBe('README.md');
  });
});
