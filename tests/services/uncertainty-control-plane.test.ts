import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UncertaintyRegistry } from '../../src/services/UncertaintyRegistry';
import { PolicyEngine, DEFAULT_RULES } from '../../src/services/PolicyEngine';
import { Claim, AgentRun, UncertaintyState, UncertaintyAction } from '../../src/types/uncertainty';

describe('Uncertainty Control Plane', () => {
  let registry: UncertaintyRegistry;
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    registry = new UncertaintyRegistry();
    policyEngine = new PolicyEngine(DEFAULT_RULES);
  });

  describe('UncertaintyRegistry', () => {
    it('should attach to entity and track state', () => {
      const claim: Claim = { id: 'claim-123', type: 'Claim', statement: 'Iran regime stability post-blackout' };
      const initialState: UncertaintyState = {
        lifecycle: 'representation',
        metrics: { epistemic: 0.2, aleatoric: 0.1, diverseAgentEntropy: 0.3 },
        sensors: [],
        actions: []
      };

      const record = registry.attachToEntity(claim, initialState);
      expect(record.entityId).toBe(claim.id);
      expect(record.lifecycle).toBe('representation');
      expect(registry.getRecord(claim.id)).toBeDefined();
    });

    it('should estimate uncertainty', () => {
      const metrics = registry.estimateUncertainty('low risk output', ['logits', 'multiAgentVote']);
      expect(metrics.aleatoric).toBeGreaterThan(0);
      expect(metrics.diverseAgentEntropy).toBeGreaterThan(0);
      expect(metrics.epistemic).toBe(0); // debateScore not used
    });

    it('should trigger high epistemic uncertainty when output has highRisk', () => {
        const metrics = registry.estimateUncertainty('this is highRisk output', ['logits', 'multiAgentVote', 'debateScore']);
        expect(metrics.epistemic).toBeGreaterThan(0.8);
    });

    it('should evolve state with new evidence', () => {
      const claim: Claim = { id: 'claim-123', type: 'Claim', statement: 'Iran regime stability post-blackout' };
      const initialState: UncertaintyState = {
        lifecycle: 'representation',
        metrics: { epistemic: 0.8, aleatoric: 0.1, diverseAgentEntropy: 0.3 },
        sensors: [],
        actions: []
      };

      const current = registry.attachToEntity(claim, initialState);
      const evolved = registry.evolveState(current, 'New sensor data');

      expect(evolved.lifecycle).toBe('identification');
      expect(evolved.sensors.length).toBe(1);
      expect(evolved.metrics.epistemic).toBeCloseTo(0.7); // 0.8 - 0.1
    });
  });

  describe('PolicyEngine', () => {
    it('should evaluate policy and trigger actions when epistemic > 0.7 and diverseAgentEntropy > 0.4', () => {
      const record = registry.attachToEntity({ id: 'task-1', type: 'Task' }, {
        lifecycle: 'identification',
        metrics: { epistemic: 0.8, aleatoric: 0.1, diverseAgentEntropy: 0.5 },
        sensors: [],
        actions: []
      });

      const actions = policyEngine.evaluatePolicy(record);
      expect(actions).toContain('requireMultiAgentDebate');
      expect(actions).toContain('spawnDebateAgents');
    });

    it('should escalate when epistemic > 0.9', () => {
        const record = registry.attachToEntity({ id: 'task-1', type: 'Task' }, {
            lifecycle: 'identification',
            metrics: { epistemic: 0.95, aleatoric: 0.1, diverseAgentEntropy: 0.5 },
            sensors: [],
            actions: []
        });

        const actions = policyEngine.evaluatePolicy(record);
        expect(actions).toContain('humanEscalate');
    });

    it('should return none when no policies match', () => {
      const record = registry.attachToEntity({ id: 'task-2', type: 'Task' }, {
        lifecycle: 'evolution',
        metrics: { epistemic: 0.1, aleatoric: 0.1, diverseAgentEntropy: 0.1 },
        sensors: [],
        actions: []
      });

      const actions = policyEngine.evaluatePolicy(record);
      expect(actions).toEqual(['none']);
    });

    it('should execute maestro wrapper successfully', async () => {
        const record = registry.attachToEntity({ id: 'agent-run-1', type: 'AgentRun' }, {
            lifecycle: 'representation',
            metrics: { epistemic: 0.1, aleatoric: 0.1, diverseAgentEntropy: 0.1 },
            sensors: [],
            actions: []
        });

        const agentFn = vi.fn().mockResolvedValue('success');
        const onAdaptation = vi.fn();

        const result = await policyEngine.executeWithUncertaintyWrap(
            { id: 'run-1', type: 'AgentRun' },
            record,
            agentFn,
            onAdaptation
        );

        expect(result).toBe('success');
        expect(agentFn).toHaveBeenCalled();
        expect(onAdaptation).not.toHaveBeenCalled(); // No policies match
    });

    it('should trigger adaptation callback in maestro wrapper when policies match', async () => {
        const record = registry.attachToEntity({ id: 'agent-run-2', type: 'AgentRun' }, {
            lifecycle: 'representation',
            metrics: { epistemic: 0.8, aleatoric: 0.1, diverseAgentEntropy: 0.5 },
            sensors: [],
            actions: []
        });

        const agentFn = vi.fn().mockResolvedValue('success');
        const onAdaptation = vi.fn();

        const result = await policyEngine.executeWithUncertaintyWrap(
            { id: 'run-2', type: 'AgentRun' },
            record,
            agentFn,
            onAdaptation
        );

        expect(result).toBe('success');
        expect(agentFn).toHaveBeenCalled();
        expect(onAdaptation).toHaveBeenCalledWith(expect.arrayContaining(['requireMultiAgentDebate', 'spawnDebateAgents']));
    });

    it('should block execution and throw error when humanEscalate policy is triggered', async () => {
        const record = registry.attachToEntity({ id: 'agent-run-3', type: 'AgentRun' }, {
            lifecycle: 'representation',
            metrics: { epistemic: 0.95, aleatoric: 0.1, diverseAgentEntropy: 0.5 },
            sensors: [],
            actions: []
        });

        const agentFn = vi.fn().mockResolvedValue('success');

        await expect(policyEngine.executeWithUncertaintyWrap(
            { id: 'run-3', type: 'AgentRun' },
            record,
            agentFn
        )).rejects.toThrow('Execution blocked: humanEscalate triggered for agent run run-3');

        expect(agentFn).not.toHaveBeenCalled();
    });
  });

  describe('Iran war narrative POC', () => {
    it('should simulate full lifecycle of claim analysis', () => {
      // 1. Represent
      const claim: Claim = { id: 'iran-1', type: 'Claim', statement: 'Iran regime stability post-blackout' };
      const initialState: UncertaintyState = {
        lifecycle: 'representation',
        metrics: { epistemic: 0.6, aleatoric: 0.4, diverseAgentEntropy: 0.2 },
        sensors: [],
        actions: []
      };

      let record = registry.attachToEntity(claim, initialState);
      expect(record.lifecycle).toBe('representation');

      // 2. Identify gaps (simulate output with high risk triggers)
      const mockAgentOutput = 'Initial analysis shows highRisk of regime change';
      const estimatedMetrics = registry.estimateUncertainty(mockAgentOutput, ['debateScore', 'multiAgentVote']);

      // Update record with high uncertainty
      record = {
          ...record,
          metrics: {
              ...estimatedMetrics,
              epistemic: Math.max(0.8, estimatedMetrics.epistemic) // Force high epistemic for test
          }
      };

      // 3. Evolve with mock agents
      record = registry.evolveState(record, { source: 'osint_agent', findings: 'power grid failure confirmed' });
      expect(record.lifecycle).toBe('identification');

      // 4. Adapt
      // Check policies against current state
      const actions = policyEngine.evaluatePolicy(record);
      if(actions.length > 0 && actions[0] !== 'none') {
        record.actions = actions;
      }

      record = registry.evolveState(record, { source: 'debate_agent', consensus: 'stability uncertain' });
      expect(record.lifecycle).toBe('evolution');
      expect(record.actions).toContain('requireMultiAgentDebate');
    });
  });
});
