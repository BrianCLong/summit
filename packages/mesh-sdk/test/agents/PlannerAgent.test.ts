/**
 * PlannerAgent Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlannerAgent } from '../../src/agents/PlannerAgent.js';
import type { AgentServices, TaskInput } from '../../src/index.js';

describe('PlannerAgent', () => {
  let agent: PlannerAgent;
  let mockServices: AgentServices;

  beforeEach(() => {
    agent = new PlannerAgent();
    mockServices = createMockServices();
  });

  describe('getDescriptor', () => {
    it('should return correct agent metadata', () => {
      const descriptor = agent.getDescriptor();

      expect(descriptor.name).toBe('planner-agent');
      expect(descriptor.role).toBe('planner');
      expect(descriptor.riskTier).toBe('medium');
      expect(descriptor.capabilities).toContain('task_decomposition');
    });
  });

  describe('onTaskReceived', () => {
    it('should generate a plan from an objective', async () => {
      mockServices.model.complete = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          steps: [
            { id: 'step-1', description: 'Research', agentRole: 'researcher', dependencies: [], priority: 1 },
          ],
          estimatedDuration: 30,
          riskAssessment: 'Low risk',
        }),
        tokensIn: 100,
        tokensOut: 200,
        latencyMs: 500,
        model: 'claude-sonnet-4-5-20250929',
        provider: 'anthropic',
      });

      mockServices.mesh.spawnSubtask = vi.fn().mockResolvedValue('subtask-1');
      mockServices.mesh.awaitSubtask = vi.fn().mockResolvedValue({
        taskId: 'subtask-1',
        status: 'completed',
        result: {},
      });

      const input: TaskInput<{ objective: string }> = {
        task: {
          id: 'task-1',
          type: 'planning',
          input: {},
          priority: 1,
          metadata: {},
          createdAt: new Date().toISOString(),
        },
        context: {} as TaskInput['context'],
        payload: { objective: 'Implement a new feature' },
      };

      const result = await agent.onTaskReceived(input, mockServices);

      expect(result.status).toBe('completed');
      expect(result.result).toHaveProperty('plan');
      expect(result.result?.plan.steps).toHaveLength(1);
    });

    it('should handle planning failures gracefully', async () => {
      mockServices.model.complete = vi.fn().mockRejectedValue(new Error('Model unavailable'));

      const input: TaskInput<{ objective: string }> = {
        task: {
          id: 'task-1',
          type: 'planning',
          input: {},
          priority: 1,
          metadata: {},
          createdAt: new Date().toISOString(),
        },
        context: {} as TaskInput['context'],
        payload: { objective: 'Test objective' },
      };

      const result = await agent.onTaskReceived(input, mockServices);

      expect(result.status).toBe('failed');
      expect(result.error?.code).toBe('PLANNING_FAILED');
      expect(result.error?.recoverable).toBe(true);
    });
  });
});

function createMockServices(): AgentServices {
  return {
    provenance: {
      record: vi.fn().mockResolvedValue('record-id'),
      query: vi.fn().mockResolvedValue([]),
    },
    tools: {
      invoke: vi.fn().mockResolvedValue({}),
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
    },
    model: {
      complete: vi.fn().mockResolvedValue({ content: '', tokensIn: 0, tokensOut: 0, latencyMs: 0, model: '', provider: '' }),
      chat: vi.fn().mockResolvedValue({ content: '', tokensIn: 0, tokensOut: 0, latencyMs: 0, model: '', provider: '' }),
    },
    mesh: {
      spawnSubtask: vi.fn().mockResolvedValue('subtask-id'),
      awaitSubtask: vi.fn().mockResolvedValue({ taskId: '', status: 'completed', result: {} }),
      requestAgent: vi.fn().mockResolvedValue(null),
    },
    metrics: {
      increment: vi.fn(),
      gauge: vi.fn(),
      histogram: vi.fn(),
      timing: vi.fn(),
    },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}
