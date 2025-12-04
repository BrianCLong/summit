import { describe, expect, it } from 'vitest';
import {
  AgentMarketplace,
  ConsensusProtocol,
  SwarmOrchestrator,
  TaskDecomposer,
  type TaskDefinition,
} from '../src/swarm.js';

const baseAgents = [
  {
    id: 'alpha',
    capabilities: ['analysis', 'action'],
    costPerTask: 1.5,
    reliability: 0.85,
    throughput: 30,
    reputation: 0.6,
  },
  {
    id: 'beta',
    capabilities: ['analysis', 'validation'],
    costPerTask: 1.1,
    reliability: 0.78,
    throughput: 26,
    reputation: 0.72,
  },
];

describe('TaskDecomposer', () => {
  it('splits tasks into capability-driven children', () => {
    const task: TaskDefinition = {
      id: 'parent',
      goal: 'achieve mission',
      requiredCapabilities: ['analysis', 'action', 'validation'],
      priority: 4,
      budget: 12,
    };
    const decomposed = TaskDecomposer.decompose(task);
    expect(decomposed.children?.length).toBe(3);
    expect(decomposed.children?.map((child) => child.parentId)).toEqual([
      'parent',
      'parent',
      'parent',
    ]);
    expect(decomposed.children?.map((child) => child.requiredCapabilities[0])).toEqual(
      ['analysis', 'action', 'validation'],
    );
  });

  it('returns task unchanged when no capabilities', () => {
    const task: TaskDefinition = {
      id: 'solo',
      goal: 'solo task',
      requiredCapabilities: [],
      priority: 1,
      budget: 1,
    };
    const decomposed = TaskDecomposer.decompose(task);
    expect(decomposed.children).toEqual([]);
  });
});

describe('AgentMarketplace', () => {
  it('scores bids and updates reputation bounds', () => {
    const marketplace = new AgentMarketplace(baseAgents);
    const task: TaskDefinition = {
      id: 't1',
      goal: 'analyze',
      requiredCapabilities: ['analysis'],
      priority: 5,
      budget: 5,
    };
    const bids = marketplace.placeBids(task);
    expect(bids[0].price).toBeGreaterThan(0);

    const updated = marketplace.updateReputation('alpha', 0.5);
    expect(updated.reputation).toBeLessThanOrEqual(1);
    const reduced = marketplace.updateReputation('alpha', -2);
    expect(reduced.reputation).toBeGreaterThanOrEqual(0);
  });
});

describe('SwarmOrchestrator', () => {
  it('recovers with fallback agents and records communication', async () => {
    const marketplace = new AgentMarketplace([
      {
        id: 'primary',
        capabilities: ['analysis'],
        costPerTask: 1,
        reliability: 0.9,
        throughput: 20,
        reputation: 0.8,
      },
      {
        id: 'secondary',
        capabilities: ['analysis'],
        costPerTask: 1.2,
        reliability: 0.85,
        throughput: 18,
        reputation: 0.7,
      },
    ]);
    const orchestrator = new SwarmOrchestrator({ marketplace, maxParallel: 2 });
    const task: TaskDefinition = {
      id: 'critical',
      goal: 'assess',
      requiredCapabilities: ['analysis'],
      priority: 5,
      budget: 6,
    };

    let firstAttempt = true;
    const executor = async (_task: TaskDefinition, agentId: string) => {
      if (_task.parentId === undefined && agentId === 'primary' && firstAttempt) {
        firstAttempt = false;
        throw new Error('simulated failure');
      }
      return {
        status: 'success' as const,
        cost: 1.5,
        result: { agentId },
        confidence: 0.9,
      };
    };

    const { outcomes } = await orchestrator.executeTasks([task], executor);
    const parentOutcome = outcomes.find((outcome) => outcome.taskId === 'critical');
    expect(parentOutcome?.agentId).toBe('secondary');
    expect(parentOutcome?.status).toBe('success');
    expect(parentOutcome?.fallbackChain).toContain('primary');
    expect(parentOutcome?.consensus?.winner?.agentId).toBe('secondary');
    expect(parentOutcome?.confidence).toBeCloseTo(0.9);
    expect(orchestrator.messages.some((message) => message.content.includes('Attempting fallback'))).toBe(
      true,
    );
  });

  it('clears active assignments after failure paths', async () => {
    const marketplace = new AgentMarketplace([
      {
        id: 'single',
        capabilities: ['analysis'],
        costPerTask: 1,
        reliability: 0.5,
        throughput: 10,
        reputation: 0.5,
      },
    ]);
    const orchestrator = new SwarmOrchestrator({ marketplace, maxParallel: 1 });
    const task: TaskDefinition = {
      id: 'failing',
      goal: 'fail',
      requiredCapabilities: ['analysis'],
      priority: 1,
      budget: 2,
    };

    const executor = async () => {
      throw new Error('hard failure');
    };

    const { outcomes } = await orchestrator.executeTasks([task], executor);
    expect(outcomes[0].status).toBe('failed');
    const activeAssignments = (orchestrator as unknown as { activeAssignments: Map<string, number> }).activeAssignments;
    expect(activeAssignments.get('single')).toBe(0);
  });

  it('respects maxParallel by bounding concurrent executor calls', async () => {
    const marketplace = new AgentMarketplace([
      {
        id: 'c1',
        capabilities: ['general'],
        costPerTask: 1,
        reliability: 0.8,
        throughput: 10,
        reputation: 0.6,
      },
    ]);
    const orchestrator = new SwarmOrchestrator({ marketplace, maxParallel: 1 });
    const tasks: TaskDefinition[] = Array.from({ length: 3 }).map((_, index) => ({
      id: `t-${index + 1}`,
      goal: 'bounded concurrency',
      requiredCapabilities: [],
      priority: 1,
      budget: 1,
    }));

    let inFlight = 0;
    let maxObserved = 0;

    const executor = async () => {
      inFlight += 1;
      maxObserved = Math.max(maxObserved, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      return { status: 'success' as const, cost: 0.1 };
    };

    await orchestrator.executeTasks(tasks, executor);

    expect(maxObserved).toBeLessThanOrEqual(1);
  });
});

describe('ConsensusProtocol', () => {
  it('favors higher confidence weighted by reputation', () => {
    const marketplace = new AgentMarketplace(baseAgents);
    const protocol = new ConsensusProtocol(() =>
      new Map(
        marketplace
          .list()
          .map((agent) => [agent.id, agent.reputation]),
      ),
    );
    const result = protocol.aggregate([
      {
        agentId: 'alpha',
        taskId: 'x',
        result: { value: 'a' },
        cost: 1,
        confidence: 0.6,
      },
      {
        agentId: 'beta',
        taskId: 'x',
        result: { value: 'b' },
        cost: 1,
        confidence: 0.9,
      },
    ]);
    expect(result.winner?.agentId).toBe('beta');
    expect(result.agreement).toBeGreaterThan(0);
  });
});
