import { describe, expect, it } from 'vitest';

import {
  CapabilityProfile,
  CooperationArtifact,
  TaskSpec,
} from '@ga-graphai/common-types';
import { ProvenanceLedger } from '@ga-graphai/prov-ledger';

import {
  CapabilityRegistry,
  PolicyRouter,
  TicketNormalizer,
  CooperationOrchestrator,
} from '../src/index.js';

const defaultPolicy = {
  purpose: 'engineering' as const,
  retention: 'standard-365d' as const,
  licenseClass: 'MIT-OK' as const,
  pii: false,
};

const defaultConstraints = {
  latencyP95Ms: 900,
  budgetUSD: 5,
  contextTokensMax: 8000,
};

function createNormalizer(): TicketNormalizer {
  return new TicketNormalizer({
    defaultPolicy,
    defaultConstraints,
  });
}

function createMockProfile(id: string, skills: string[], overrides: Partial<CapabilityProfile> = {}): CapabilityProfile {
  return {
    id,
    displayName: id,
    type: 'foundation',
    skills,
    costUSDPer1kTokens: 0.02,
    latencyMsP95: 500,
    contextWindowTokens: 16000,
    safety: 'high',
    residency: 'global',
    maxConcurrency: 4,
    reliabilityScore: 0.9,
    ...overrides,
  };
}

type GenerateHandler = (prompt: string) => string;

function registerMockResource(
  registry: CapabilityRegistry,
  id: string,
  skills: string[],
  handler: GenerateHandler,
  options: {
    bid?: { quality: number; latencyMs: number; costUSD: number; fitTags?: string[] };
    evaluate?: (content: CooperationArtifact) => number;
    critique?: (content: CooperationArtifact) => number;
    workbook?: () => CooperationArtifact['supportingEvidence'];
  } = {},
) {
  registry.register({
    profile: createMockProfile(id, skills),
    bid() {
      return {
        modelId: id,
        est: {
          quality: options.bid?.quality ?? 0.8,
          latencyMs: options.bid?.latencyMs ?? 400,
          costUSD: options.bid?.costUSD ?? 0.2,
        },
        confidence: 0.7,
        fitTags: options.bid?.fitTags ?? ['engineering'],
        rationale: `skills:${skills.join(',')}`,
      };
    },
    async generate({ prompt }) {
      return {
        content: handler(prompt),
        evidence: [{ id: `${id}-evidence`, description: 'mock', uri: `memory://${id}` }],
      };
    },
    critique: options.critique
      ? async (artifact) => [
          {
            axis: 'accuracy',
            score: options.critique!(artifact),
            rationale: 'cross-eval',
          },
        ]
      : undefined,
    evaluate: options.evaluate
      ? async (artifact) => [
          {
            axis: 'accuracy',
            score: options.evaluate!(artifact),
            rationale: 'adjudication',
          },
        ]
      : undefined,
    runWorkbook: options.workbook
      ? async () => ({
          id: `${id}-workbook`,
          commands: [],
          status: 'passed',
          artifacts: options.workbook!(),
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        })
      : undefined,
  });
}

describe('Ticket normalizer', () => {
  it('produces structured TaskSpecs and clarifying questions', () => {
    const normalizer = createNormalizer();
    const normalized = normalizer.normalize({
      ticketId: 'T-1',
      tenantId: 'tenant',
      title: 'Improve latency',
      body: `Goal: Reduce API latency.\n\nP95 must be <= 350 ms.\nBudget: $2 USD.\nRisk: rollout regression.\nEvidence: https://intelgraph.example/report.\n` +
        `Out of scope: UI work.\nAcceptance: Ensure AC-1 passes.\n` +
        `Maybe adjust caches later.`,
    });
    expect(normalized.taskSpec.goal).toContain('Reduce API latency');
    expect(normalized.taskSpec.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(normalized.clarifyingQuestions.length).toBeGreaterThan(0);
    expect(normalized.ticket.ambiguities).toContain('maybe');
  });
});

describe('Policy router', () => {
  it('selects value dense resources and chooses cooperation mode', () => {
    const registry = new CapabilityRegistry();
    registerMockResource(registry, 'model-a', ['engineering', 'typescript'], () => 'Spec draft', {
      bid: { quality: 0.92, latencyMs: 300, costUSD: 0.3, fitTags: ['engineering'] },
    });
    registerMockResource(registry, 'model-b', ['risk', 'testing'], () => 'Test draft', {
      bid: { quality: 0.88, latencyMs: 400, costUSD: 0.1, fitTags: ['testing'] },
    });

    const normalizer = createNormalizer();
    const { taskSpec } = normalizer.normalize({
      ticketId: 'T-2',
      tenantId: 'tenant',
      title: 'Ship feature',
      body: 'Goal: Ship.\nP95 500 ms.\nAcceptance: AC-1 must pass. AC-2 must pass.\n',
    });

    const router = new PolicyRouter(registry, { qualityFloor: 0.5 });
    const decision = router.route(taskSpec);
    expect(decision.primaryAssignments).toContain('model-a');
    expect(decision.mode).toBe('semantic-braid');
  });
});

describe('Cooperation orchestrator', () => {
  it('executes semantic braid with strand consistency checks', async () => {
    const registry = new CapabilityRegistry();
    registerMockResource(registry, 'spec-model', ['spec'], () => '`getMetrics` returns JSON');
    registerMockResource(registry, 'test-model', ['tests'], () => 'API:getMetrics happy-path');
    registerMockResource(registry, 'risk-model', ['risk'], () => 'Latency regression risk');

    const normalizer = createNormalizer();
    const normalized = normalizer.normalize({
      ticketId: 'T-3',
      tenantId: 'tenant',
      title: 'Build metrics API',
      body: 'Goal: Provide metrics.\nAcceptance: AC-1 ensure latency <= 500ms.',
    });

    const decision = {
      mode: 'semantic-braid' as const,
      primaryAssignments: ['spec-model'],
      supportAssignments: ['test-model', 'risk-model'],
      expectedCostUSD: 0.5,
      expectedLatencyMs: 400,
      provenanceRef: 'router',
    };
    const ledger = new ProvenanceLedger('secret');
    const orchestrator = new CooperationOrchestrator(registry, ledger);
    const result = await orchestrator.execute(normalized.taskSpec, decision);
    expect(result.artifact.mode).toBe('semantic-braid');
    expect(result.artifact.content).toContain('#SPEC');
    expect(ledger.list(normalized.taskSpec.taskId)).toHaveLength(1);
  });

  it('merges counterfactual improvements and records coverage', async () => {
    const registry = new CapabilityRegistry();
    registerMockResource(registry, 'primary-model', ['impl'], () => 'Plan covers AC-1');
    registerMockResource(registry, 'shadow-model', ['analysis'], () => 'Shadow focuses on AC-2 risk');
    registerMockResource(registry, 'adjudicator-model', ['audit'], () => 'Adjudicate', {
      evaluate: () => 0.95,
    });

    const task: TaskSpec = {
      taskId: 'task-shadow',
      tenantId: 'tenant',
      title: 'Shadow test',
      goal: 'Handle risks',
      nonGoals: [],
      inputs: [],
      constraints: defaultConstraints,
      policy: defaultPolicy,
      acceptanceCriteria: [
        { id: 'AC-1', statement: 'Primary coverage', verify: 'test', metric: 'pass', threshold: '1.0' },
        { id: 'AC-2', statement: 'Shadow coverage', verify: 'test', metric: 'pass', threshold: '1.0' },
      ],
      risks: [],
      raci: { owner: 'owner', reviewers: ['reviewer'] },
      sla: { due: new Date().toISOString() },
      policyTags: ['purpose:engineering', 'retention:standard-365d', 'pii:absent'],
      language: 'en',
    };

    const decision = {
      mode: 'counterfactual-shadowing' as const,
      primaryAssignments: ['primary-model'],
      supportAssignments: ['shadow-model', 'adjudicator-model'],
      expectedCostUSD: 1,
      expectedLatencyMs: 500,
      provenanceRef: 'router',
    };
    const ledger = new ProvenanceLedger('secret');
    const orchestrator = new CooperationOrchestrator(registry, ledger);
    const result = await orchestrator.execute(task, decision);
    expect(result.artifact.mode).toBe('counterfactual-shadowing');
    expect(result.artifact.content).toContain('Counterfactual Enhancements');
    expect(result.artifact.acceptanceCriteriaSatisfied).toContain('accuracy');
  });
});
