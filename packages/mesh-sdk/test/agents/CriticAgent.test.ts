/**
 * CriticAgent Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CriticAgent } from '../../src/agents/CriticAgent.js';
import type { AgentServices, TaskInput } from '../../src/index.js';

describe('CriticAgent', () => {
  let agent: CriticAgent;
  let mockServices: AgentServices;

  beforeEach(() => {
    agent = new CriticAgent();
    mockServices = createMockServices();
  });

  describe('getDescriptor', () => {
    it('should return correct agent metadata', () => {
      const descriptor = agent.getDescriptor();

      expect(descriptor.name).toBe('critic-agent');
      expect(descriptor.role).toBe('critic');
      expect(descriptor.riskTier).toBe('low');
      expect(descriptor.capabilities).toContain('quality_assessment');
    });
  });

  describe('onTaskReceived', () => {
    it('should approve high-quality content', async () => {
      mockServices.model.complete = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          score: 90,
          rationale: 'Well-structured code',
          issues: [],
        }),
        tokensIn: 100,
        tokensOut: 50,
        latencyMs: 200,
        model: 'claude-sonnet-4-5-20250929',
        provider: 'anthropic',
      });

      const input: TaskInput<{ content: string; contentType: 'code' }> = {
        task: {
          id: 'task-1',
          type: 'review',
          input: {},
          priority: 1,
          metadata: {},
          createdAt: new Date().toISOString(),
        },
        context: {} as TaskInput['context'],
        payload: {
          content: 'function add(a, b) { return a + b; }',
          contentType: 'code',
        },
      };

      const result = await agent.onTaskReceived(input, mockServices);

      expect(result.status).toBe('completed');
      expect(result.result?.verdict).toBe('approved');
    });

    it('should reject content with critical issues', async () => {
      mockServices.model.complete = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          score: 20,
          rationale: 'Contains security vulnerabilities',
          issues: [
            { severity: 'critical', category: 'safety', description: 'SQL injection vulnerability' },
          ],
        }),
        tokensIn: 100,
        tokensOut: 100,
        latencyMs: 300,
        model: 'claude-sonnet-4-5-20250929',
        provider: 'anthropic',
      });

      const input: TaskInput<{ content: string; contentType: 'code' }> = {
        task: {
          id: 'task-1',
          type: 'review',
          input: {},
          priority: 1,
          metadata: {},
          createdAt: new Date().toISOString(),
        },
        context: {} as TaskInput['context'],
        payload: {
          content: 'db.query(`SELECT * FROM users WHERE id = ${userId}`)',
          contentType: 'code',
        },
      };

      const result = await agent.onTaskReceived(input, mockServices);

      expect(result.status).toBe('completed');
      expect(result.result?.verdict).toBe('rejected');
      expect(result.result?.issues.length).toBeGreaterThan(0);
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
