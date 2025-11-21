/**
 * RedTeamAgent Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedTeamAgent } from '../../src/agents/RedTeamAgent.js';
import type { AgentServices, TaskInput } from '../../src/index.js';

describe('RedTeamAgent', () => {
  let agent: RedTeamAgent;
  let mockServices: AgentServices;

  beforeEach(() => {
    agent = new RedTeamAgent();
    mockServices = createMockServices();
  });

  describe('getDescriptor', () => {
    it('should return correct agent metadata', () => {
      const descriptor = agent.getDescriptor();

      expect(descriptor.name).toBe('red-team-agent');
      expect(descriptor.role).toBe('red_teamer');
      expect(descriptor.riskTier).toBe('low');
      expect(descriptor.capabilities).toContain('security_analysis');
      expect(descriptor.capabilities).toContain('prompt_injection_detection');
    });
  });

  describe('onTaskReceived', () => {
    it('should detect security vulnerabilities', async () => {
      mockServices.model.complete = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          found: true,
          vulnerabilities: [
            {
              type: 'security',
              severity: 'high',
              description: 'SQL injection vulnerability detected',
              evidence: 'Unparameterized query',
              remediation: 'Use parameterized queries',
            },
          ],
        }),
        tokensIn: 100,
        tokensOut: 150,
        latencyMs: 500,
        model: 'claude-sonnet-4-5-20250929',
        provider: 'anthropic',
      });

      const input: TaskInput<{ content: string; contentType: 'code' }> = {
        task: {
          id: 'task-1',
          type: 'red_team',
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
      expect(result.result?.overallRisk).toBe('high');
      expect(result.result?.vulnerabilities.length).toBeGreaterThan(0);
    });

    it('should return low risk for secure content', async () => {
      mockServices.model.complete = vi.fn().mockResolvedValue({
        content: JSON.stringify({
          found: false,
          vulnerabilities: [],
        }),
        tokensIn: 100,
        tokensOut: 50,
        latencyMs: 300,
        model: 'claude-sonnet-4-5-20250929',
        provider: 'anthropic',
      });

      const input: TaskInput<{ content: string; contentType: 'code' }> = {
        task: {
          id: 'task-1',
          type: 'red_team',
          input: {},
          priority: 1,
          metadata: {},
          createdAt: new Date().toISOString(),
        },
        context: {} as TaskInput['context'],
        payload: {
          content: 'const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);',
          contentType: 'code',
        },
      };

      const result = await agent.onTaskReceived(input, mockServices);

      expect(result.status).toBe('completed');
      expect(result.result?.overallRisk).toBe('low');
      expect(result.result?.passedChecks.length).toBeGreaterThan(0);
    });
  });
});

describe('JudgeAgent', () => {
  // Import dynamically to avoid issues
  it('should have correct descriptor', async () => {
    const { JudgeAgent } = await import('../../src/agents/JudgeAgent.js');
    const agent = new JudgeAgent();
    const descriptor = agent.getDescriptor();

    expect(descriptor.name).toBe('judge-agent');
    expect(descriptor.role).toBe('judge');
    expect(descriptor.capabilities).toContain('quality_scoring');
    expect(descriptor.capabilities).toContain('final_approval');
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
