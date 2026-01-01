
import { governedRuntime } from '../runtime/GovernedRuntime';
import { killSwitchService } from '../runtime/KillSwitchService';
import { describe, test } from 'node:test';
import assert from 'node:assert';

describe('GovernedAgentRuntime', () => {
  const mockAgent = {
    id: 'agent-1',
    name: 'Test Agent',
    tenantId: 'tenant-1',
    capabilities: [],
    model: 'gpt-4'
  } as any;

  const mockTask = {
    id: 'task-1',
    title: 'Do something',
    metadata: { accessMode: 'snapshot' }
  } as any;

  const defaultConfig = {
    maxTimeMs: 100,
    maxMemoryBytes: 1024 * 1024 * 100, // 100MB
    maxOutputChars: 1000,
    snapshotOnly: true,
    confidenceThreshold: 0.8
  };

  test('should execute successfully within limits', async () => {
    const executor = async () => 'success';
    const result = await governedRuntime.executeAgent(mockAgent, mockTask, defaultConfig, executor);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data, 'success');
    assert.strictEqual(result.provenance.agentId, mockAgent.id);
  });

  test('should block live data access', async () => {
    const liveTask = { ...mockTask, metadata: { accessMode: 'live' } };
    const executor = async () => 'success';
    const result = await governedRuntime.executeAgent(mockAgent, liveTask, defaultConfig, executor);

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('Live data access detected'));
  });

  test('should enforce timeout', async () => {
    const executor = async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return 'too slow';
    };
    const result = await governedRuntime.executeAgent(mockAgent, mockTask, defaultConfig, executor);

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('timed out'));
  });

  test('should enforce output size limit', async () => {
    const executor = async () => 'a'.repeat(2000);
    const result = await governedRuntime.executeAgent(mockAgent, mockTask, defaultConfig, executor);

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('Output size exceeded'));
  });

  test('should filter forbidden language', async () => {
    const executor = async () => 'DROP TABLE users';
    const result = await governedRuntime.executeAgent(mockAgent, mockTask, defaultConfig, executor);

    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes('forbidden language'));
  });
});

describe('KillSwitchService', () => {
  // Mock Redis
  // Ideally we would mock the killSwitchService's internal redis, but since it's a singleton importing ioredis,
  // we might need to rely on the fact that we can't easily connect to real redis in this unit test env unless setup.
  // Assuming mocked redis behavior or skip if strictly unit testing without deps.
  // For now, let's just test the logic if we could mock the methods.
});
