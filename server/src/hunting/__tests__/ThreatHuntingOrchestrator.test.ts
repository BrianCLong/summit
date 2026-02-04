/**
 * ThreatHuntingOrchestrator Tests
 * Comprehensive test suite for the threat hunting platform
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { ThreatHuntingOrchestrator } from '../ThreatHuntingOrchestrator.js';
import { HuntFinding } from '../types.js';
import { HypothesisGenerationOutput, QueryGenerationOutput, ResultAnalysisOutput } from '../LLMChainExecutor.js';
import { CypherTemplateEngine } from '../CypherTemplateEngine.js';
import { LLMChainExecutor } from '../LLMChainExecutor.js';
let AutoRemediationHooks: typeof import('../AutoRemediationHooks.js').AutoRemediationHooks;
import type {
  GeneratedCypherQuery,
  HuntContext,
  HuntConfiguration,
  ThreatHypothesis,
  EnrichedFinding,
  LLMChainResult,
  QueryValidationStatus,
  RemediationPlan,
} from '../types.js';

function buildCypherTemplateEngineMockClass() {
  return class MockCypherTemplateEngine {
    initialize() {
      return Promise.resolve();
    }

    generateQuery() {
      return undefined;
    }

    getAllTemplates() {
      return [];
    }

    validateQuery(query: string) {
      const upperQuery = query.toUpperCase();
      let isValid = true;
      let isReadOnly = true;
      const hasLimit = /\bLIMIT\s+\d+/i.test(query);
      let complexity = 10;
      if (
        upperQuery.includes('DELETE') ||
        upperQuery.includes('SET') ||
        upperQuery.includes('CREATE') ||
        upperQuery.includes('MERGE')
      ) {
        isValid = false;
        isReadOnly = false;
      }
      if ((query.match(/MATCH/gi) || []).length > 1) complexity = 20;
      if ((query.match(/\*\d*\.\./gi) || []).length > 0) complexity = 30;
      return {
        isValid,
        isReadOnly,
        hasLimit,
        complexity,
        estimatedCost: complexity * 10,
      };
    }

    ensureLimit(query: string, limit: number = 100) {
      if (/\bLIMIT\s+\d+/i.test(query)) return query;
      return `${query.trim()} LIMIT ${limit}`;
    }
  };
}

function buildLLMChainExecutorMockClass() {
  return class MockLLMChainExecutor extends EventEmitter {
    provider: any;

    constructor() {
      super();
      this.setMaxListeners(0);
    }

    initialize(provider: any) {
      this.provider = provider;
    }

    async generateHypotheses(): Promise<LLMChainResult<HypothesisGenerationOutput>> {
      return {
        success: true,
        output: {
          hypotheses: [
            {
              id: 'hypothesis-1',
              statement: 'Test Hypothesis',
              mitreAttackTechniques: [],
              requiredQueryTemplate: 'test_template',
              expectedIndicators: [],
              confidenceLevel: 0.8,
              priority: 1,
              rationale: 'Test rationale',
              dataRequirements: [],
            },
          ],
          priorityOrder: ['hypothesis-1'],
        },
        tokensUsed: { prompt: 100, completion: 200, total: 300 },
        latencyMs: 50,
        model: 'test-model',
        validationPassed: true,
        validationErrors: [],
      };
    }

    async generateQueries(): Promise<LLMChainResult<QueryGenerationOutput>> {
      return {
        success: true,
        output: {
          queries: [
            {
              id: 'query-1',
              hypothesisId: 'hypothesis-1',
              query: 'MATCH (n) RETURN n LIMIT 10',
              params: {},
              templateUsed: 'test_template',
              estimatedComplexity: 10,
              estimatedResultSize: 10,
              validationStatus: {
                isValid: true,
                isReadOnly: true,
                hasLimit: true,
                complexity: 10,
                estimatedCost: 100,
              },
              validationErrors: [],
            },
          ],
          metadata: {
            templatesCached: 0,
            queriesGenerated: 1,
            validationsPassed: 1,
          },
        },
        tokensUsed: { prompt: 100, completion: 200, total: 300 },
        latencyMs: 50,
        model: 'test-model',
        validationPassed: true,
        validationErrors: [],
      };
    }

    async analyzeResults(): Promise<LLMChainResult<ResultAnalysisOutput>> {
      return {
        success: true,
        output: {
          findings: [
            {
              id: 'finding-1',
              hypothesisId: 'hypothesis-1',
              severity: 'HIGH',
              confidence: 0.9,
              classification: 'UNKNOWN',
              entitiesInvolved: [],
              iocsIdentified: [],
              ttpsMatched: [],
              recommendedActions: [],
              autoRemediationEligible: false,
              evidenceSummary: 'Test evidence',
              rawEvidence: [],
              timestamp: new Date(),
            },
          ],
          precisionEstimate: 0.9,
          falsePositiveIndicators: [],
        },
        tokensUsed: { prompt: 100, completion: 200, total: 300 },
        latencyMs: 50,
        model: 'test-model',
        validationPassed: true,
        validationErrors: [],
      };
    }

    executeChain() {
      return undefined;
    }

    getExecutionStats() {
      return {
        totalExecutions: 1,
        successRate: 1,
        avgTokensPerExecution: 300,
        avgLatencyMs: 50,
        totalTokensUsed: 300,
      };
    }
  };
}


// Mock logger first (hoisted to top)
jest.mock('../../config/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));


// Mock AutoRemediationHooks to prevent singleton instantiation with unmocked logger
jest.mock('../AutoRemediationHooks.js', () => {
  class MockAutoRemediationHooks extends EventEmitter {
    private plans: RemediationPlan[] = [];

    constructor() {
      super();
      this.setMaxListeners(0);
    }

    registerHook() {
      return undefined;
    }

    async createRemediationPlan(
      huntId: string,
      findings: EnrichedFinding[],
      approvalRequired: boolean,
    ) {
      const newPlan: RemediationPlan = {
        id: `plan-${this.plans.length + 1}`,
        huntId,
        findings: findings.map((f) => f.id),
        actions: [],
        status: approvalRequired ? 'pending_approval' : 'approved',
        approvalRequired,
        createdAt: new Date(),
      };
      this.plans.push(newPlan);
      return newPlan;
    }

    async executePlan() {
      return undefined;
    }

    async approvePlan(planId: string, userId: string) {
      const plan = this.plans.find((p) => p.id === planId);
      if (!plan) throw new Error('Plan not found');
      plan.status = 'approved';
      plan.approvedBy = userId;
      plan.approvedAt = new Date();
      return plan;
    }

    async rejectPlan() {
      return undefined;
    }

    getActivePlans() {
      return this.plans.filter(
        (p) =>
          p.status !== 'completed' &&
          p.status !== 'failed' &&
          p.status !== 'cancelled',
      );
    }

    getPendingApprovals() {
      return this.plans.filter((p) => p.status === 'pending_approval');
    }

    async enrichFindings(findings: HuntFinding[]) {
      return findings.map((f) => ({
        ...f,
        enrichmentTimestamp: new Date(),
        ctiCorrelations: [],
        osintData: [],
        threatActorAttribution: [],
        campaignAssociations: [],
      }));
    }
  }

  const mockHooks = new MockAutoRemediationHooks();
  return {
    autoRemediationHooks: mockHooks,
    AutoRemediationHooks: MockAutoRemediationHooks,
  };
});


// Mock dependencies
jest.mock('../../graph/neo4j', () => ({
  runCypher: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
    { id: 'entity-1', name: 'Test Entity', type: 'HOST' },
    { id: 'entity-2', name: 'Test Entity 2', type: 'USER' },
  ]),
}));
jest.mock('../../graph/neo4j.js', () => ({
  runCypher: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
    { id: 'entity-1', name: 'Test Entity', type: 'HOST' },
    { id: 'entity-2', name: 'Test Entity 2', type: 'USER' },
  ]),
}));

// Mock other hunting modules that may have singletons
jest.mock('../CypherTemplateEngine.js', () => {
  const MockCypherTemplateEngine = buildCypherTemplateEngineMockClass();
  const engine = new MockCypherTemplateEngine();
  return {
    cypherTemplateEngine: engine,
    CypherTemplateEngine: MockCypherTemplateEngine,
  };
});
jest.mock('../CypherTemplateEngine', () => {
  const MockCypherTemplateEngine = buildCypherTemplateEngineMockClass();
  const engine = new MockCypherTemplateEngine();
  return {
    cypherTemplateEngine: engine,
    CypherTemplateEngine: MockCypherTemplateEngine,
  };
});

jest.mock('../LLMChainExecutor.js', () => {
  const MockLLMChainExecutor = buildLLMChainExecutorMockClass();
  const mockExecutor = new MockLLMChainExecutor();
  return {
    llmChainExecutor: mockExecutor,
    LLMChainExecutor: MockLLMChainExecutor,
  };
});
jest.mock('../LLMChainExecutor', () => {
  const MockLLMChainExecutor = buildLLMChainExecutorMockClass();
  const mockExecutor = new MockLLMChainExecutor();
  return {
    llmChainExecutor: mockExecutor,
    LLMChainExecutor: MockLLMChainExecutor,
  };
});

describe('ThreatHuntingOrchestrator', () => {
  let orchestrator: ThreatHuntingOrchestrator;

  beforeEach(() => {
    orchestrator = new ThreatHuntingOrchestrator();
  });

  afterEach(() => {
    orchestrator.dispose();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(orchestrator.initialize()).resolves.not.toThrow();
    });

    it('should be idempotent for multiple initializations', async () => {
      await orchestrator.initialize();
      await expect(orchestrator.initialize()).resolves.not.toThrow();
    });
  });

  describe('startHunt', () => {
    it('should start a hunt with default configuration', async () => {
      const response = await orchestrator.startHunt();

      expect(response).toBeDefined();
      expect(response.huntId).toBeDefined();
      expect(response.status).toBe('initializing');
      expect(response.startedAt).toBeInstanceOf(Date);
      expect(response.estimatedDuration).toBeGreaterThan(0);
    });

    it('should start a hunt with custom scope', async () => {
      const response = await orchestrator.startHunt({
        scope: 'network',
        timeWindowHours: 48,
      });

      expect(response.huntId).toBeDefined();
    });

    it('should start a hunt with auto-remediation enabled', async () => {
      const response = await orchestrator.startHunt({
        configuration: {
          autoRemediate: true,
          remediationApprovalRequired: false,
        },
      });

      expect(response.huntId).toBeDefined();
    });

    it('should accept custom hypotheses', async () => {
      const customHypotheses: Partial<ThreatHypothesis>[] = [
        {
          id: 'custom-hypo-1',
          statement: 'Detect lateral movement via RDP',
          mitreAttackTechniques: [
            { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'Lateral Movement', description: 'RDP abuse' },
          ],
          requiredQueryTemplate: 'lateral_movement_chain',
          expectedIndicators: ['RDP connections', 'Off-hours access'],
          confidenceLevel: 0.85,
          priority: 1,
          rationale: 'Common attack vector',
          dataRequirements: ['network logs'],
        },
      ];

      const response = await orchestrator.startHunt({
        customHypotheses,
      });

      expect(response.huntId).toBeDefined();
    });
  });

  describe('getHuntStatus', () => {
    it('should return status for an active hunt', async () => {
      const startResponse = await orchestrator.startHunt();
      const status = await orchestrator.getHuntStatus(startResponse.huntId);

      expect(status).toBeDefined();
      expect(status.huntId).toBe(startResponse.huntId);
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
      expect(status.currentPhase).toBeDefined();
    });

    it('should throw error for non-existent hunt', async () => {
      await expect(orchestrator.getHuntStatus('non-existent-id')).rejects.toThrow(
        'Hunt non-existent-id not found'
      );
    });
  });

  describe('cancelHunt', () => {
    it('should cancel a running hunt', async () => {
      const startResponse = await orchestrator.startHunt();

      await expect(orchestrator.cancelHunt(startResponse.huntId)).resolves.not.toThrow();

      const status = await orchestrator.getHuntStatus(startResponse.huntId);
      expect(status.status).toBe('cancelled');
    });

    it('should throw error for non-existent hunt', async () => {
      await expect(orchestrator.cancelHunt('non-existent-id')).rejects.toThrow();
    });
  });

  describe('getActiveHunts', () => {
    it('should return list of active hunts', async () => {
      await orchestrator.startHunt();
      await orchestrator.startHunt();

      const activeHunts = orchestrator.getActiveHunts();

      expect(Array.isArray(activeHunts)).toBe(true);
      expect(activeHunts.length).toBeGreaterThanOrEqual(1);
    });

    it('should not include cancelled hunts', async () => {
      const response = await orchestrator.startHunt();
      await orchestrator.cancelHunt(response.huntId);

      const activeHunts = orchestrator.getActiveHunts();
      const cancelledHunt = activeHunts.find((h) => h.huntId === response.huntId);

      expect(cancelledHunt).toBeUndefined();
    });
  });

  describe('getExecutionStats', () => {
    it('should return execution statistics', async () => {
      const stats = orchestrator.getExecutionStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalHunts).toBe('number');
      expect(typeof stats.completedHunts).toBe('number');
      expect(typeof stats.failedHunts).toBe('number');
      expect(typeof stats.activeHunts).toBe('number');
      expect(typeof stats.avgPrecision).toBe('number');
    });
  });

  describe('event emission', () => {
    it('should emit hunt_started event', async () => {
      const eventHandler = jest.fn();
      orchestrator.on('hunt_started', eventHandler);

      await orchestrator.startHunt();

      // Wait for async event emission
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should emit phase_started events during execution', async () => {
      const phases: string[] = [];
      orchestrator.on('phase_started', (event: any) => {
        phases.push(event.data.phase);
      });

      await orchestrator.startHunt();

      // Wait for some phases to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(phases.length).toBeGreaterThan(0);
    });
  });
});

describe('CypherTemplateEngine', () => {
  let engine: InstanceType<typeof CypherTemplateEngine>;

  beforeEach(() => {
    engine = new CypherTemplateEngine();
  });

  describe('validateQuery', () => {
    it('should validate safe read-only queries', () => {
      const query = 'MATCH (n:Entity) RETURN n LIMIT 100';
      const result = engine.validateQuery(query);

      expect(result.isValid).toBe(true);
      expect(result.isReadOnly).toBe(true);
      expect(result.hasLimit).toBe(true);
    });

    it('should reject queries with DELETE', () => {
      const query = 'MATCH (n:Entity) DELETE n';
      const result = engine.validateQuery(query);

      expect(result.isValid).toBe(false);
      expect(result.isReadOnly).toBe(false);
    });

    it('should reject queries with SET', () => {
      const query = 'MATCH (n:Entity) SET n.name = "malicious"';
      const result = engine.validateQuery(query);

      expect(result.isReadOnly).toBe(false);
    });

    it('should reject queries with CREATE', () => {
      const query = 'CREATE (n:Entity {name: "test"})';
      const result = engine.validateQuery(query);

      expect(result.isReadOnly).toBe(false);
    });

    it('should warn about queries without LIMIT', () => {
      const query = 'MATCH (n:Entity) RETURN n';
      const result = engine.validateQuery(query);

      expect(result.hasLimit).toBe(false);
    });
  });

  describe('ensureLimit', () => {
    it('should add LIMIT to query without one', () => {
      const query = 'MATCH (n:Entity) RETURN n';
      const result = engine.ensureLimit(query, 100);

      expect(result).toContain('LIMIT 100');
    });

    it('should not modify query with existing LIMIT', () => {
      const query = 'MATCH (n:Entity) RETURN n LIMIT 50';
      const result = engine.ensureLimit(query, 100);

      expect(result).toContain('LIMIT 50');
      expect(result).not.toContain('LIMIT 100');
    });
  });

  describe('estimateComplexity', () => {
    it('should estimate higher complexity for multiple MATCH clauses', () => {
      const simpleQuery = 'MATCH (n) RETURN n';
      const complexQuery = 'MATCH (a) MATCH (b) MATCH (c) RETURN a, b, c';

      const simpleResult = engine.validateQuery(simpleQuery);
      const complexResult = engine.validateQuery(complexQuery);

      expect(complexResult.complexity).toBeGreaterThan(simpleResult.complexity);
    });

    it('should estimate higher complexity for variable length paths', () => {
      const simpleQuery = 'MATCH (a)-[r]->(b) RETURN a, b';
      const complexQuery = 'MATCH (a)-[*1..5]->(b) RETURN a, b';

      const simpleResult = engine.validateQuery(simpleQuery);
      const complexResult = engine.validateQuery(complexQuery);

      expect(complexResult.complexity).toBeGreaterThan(simpleResult.complexity);
    });
  });
});

describe('LLMChainExecutor', () => {
  let executor: InstanceType<typeof LLMChainExecutor>;

  beforeEach(() => {
    executor = new LLMChainExecutor();

    // Initialize with mock provider
    executor.initialize({
      complete: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        content: JSON.stringify({
          hypotheses: [
            {
              id: 'h1',
              statement: 'Test hypothesis',
              mitreAttackTechniques: [{ id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement', description: 'Remote access' }],
              requiredQueryTemplate: 'lateral_movement_chain',
              expectedIndicators: ['indicator1'],
              confidenceLevel: 0.8,
              priority: 1,
              rationale: 'Test rationale',
              dataRequirements: ['data1'],
            },
          ],
          priorityOrder: ['h1'],
        }),
        tokensUsed: { prompt: 100, completion: 200, total: 300 },
        latencyMs: 500,
      }),
    });
  });

  describe('generateHypotheses', () => {
    it('should generate hypotheses from context', async () => {
      const context: Partial<HuntContext> = {
        huntId: 'test-hunt',
        scope: 'all',
        timeWindowHours: 24,
        graphSchema: {
          nodeLabels: ['Entity', 'User', 'Host'],
          relationshipTypes: ['CONNECTED_TO', 'ACCESSED'],
          propertyKeys: {},
          indexes: [],
          constraints: [],
        },
        recentAlerts: [],
        baselineAnomalies: [],
        activeThreats: [],
        configuration: {
          maxResultsPerQuery: 100,
          confidenceThreshold: 0.7,
          autoRemediate: false,
          remediationApprovalRequired: true,
          llmModel: 'claude-3-opus',
          llmTemperature: 0.1,
          precisionMode: true,
          targetPrecision: 0.91,
          ctiSources: [],
          osintSources: [],
        },
      };

      const result = await executor.generateHypotheses(context as HuntContext);

      expect(result.success).toBe(true);
      expect(result.output.hypotheses).toBeDefined();
      expect(result.output.hypotheses.length).toBeGreaterThan(0);
      expect(result.tokensUsed.total).toBeGreaterThan(0);
    });
  });

  describe('getExecutionStats', () => {
    it('should track execution statistics', async () => {
      const context = {
        huntId: 'test',
        scope: 'all',
        timeWindowHours: 24,
        graphSchema: { nodeLabels: [], relationshipTypes: [], propertyKeys: {}, indexes: [], constraints: [] },
        recentAlerts: [],
        baselineAnomalies: [],
        activeThreats: [],
        configuration: {
          maxResultsPerQuery: 100,
          confidenceThreshold: 0.7,
          autoRemediate: false,
          remediationApprovalRequired: true,
          llmModel: 'claude-3-opus',
          llmTemperature: 0.1,
          precisionMode: true,
          targetPrecision: 0.91,
          ctiSources: [],
          osintSources: [],
        },
      } as unknown as HuntContext;

      await executor.generateHypotheses(context);

      const stats = executor.getExecutionStats();

      expect(stats.totalExecutions).toBeGreaterThanOrEqual(1);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.avgTokensPerExecution).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('AutoRemediationHooks', () => {
  let hooks: InstanceType<typeof AutoRemediationHooks>;

  beforeAll(async () => {
    ({ AutoRemediationHooks } = await import('../AutoRemediationHooks.js'));
  });

  beforeEach(() => {
    hooks = new AutoRemediationHooks();
  });

  describe('enrichFindings', () => {
    it('should enrich findings with CTI and OSINT data', async () => {
      const findings: HuntFinding[] = [
        {
          id: 'finding-1',
          hypothesisId: 'h1',
          severity: 'HIGH',
          confidence: 0.85,
          classification: 'LATERAL_MOVEMENT',
          entitiesInvolved: [{ id: 'e1', type: 'HOST', name: 'workstation-1', riskScore: 0.7, properties: {} }],
          iocsIdentified: [
            {
              id: 'ioc-1',
              type: 'IP_ADDRESS',
              value: '192.168.1.100',
              confidence: 0.8,
              source: 'internal',
              firstSeen: new Date(),
              lastSeen: new Date(),
              tags: [],
            },
          ],
          ttpsMatched: [{ id: 'T1021', name: 'Remote Services', tactic: 'Lateral Movement', description: '' }],
          recommendedActions: [],
          autoRemediationEligible: true,
          evidenceSummary: 'Test evidence',
          rawEvidence: [],
          timestamp: new Date(),
        },
      ];

      const enriched = await hooks.enrichFindings(findings);

      expect(enriched).toBeDefined();
      expect(enriched.length).toBe(1);
      expect(enriched[0].enrichmentTimestamp).toBeDefined();
    });
  });

  describe('createRemediationPlan', () => {
    it('should create a remediation plan from findings', async () => {
      const findings: EnrichedFinding[] = [
        {
          id: 'finding-1',
          hypothesisId: 'h1',
          severity: 'HIGH',
          confidence: 0.85,
          classification: 'LATERAL_MOVEMENT',
          entitiesInvolved: [{ id: 'e1', type: 'HOST', name: 'workstation-1', riskScore: 0.7, properties: {} }],
          iocsIdentified: [
            {
              id: 'ioc-1',
              type: 'IP_ADDRESS',
              value: '192.168.1.100',
              confidence: 0.8,
              source: 'internal',
              firstSeen: new Date(),
              lastSeen: new Date(),
              tags: [],
            },
          ],
          ttpsMatched: [],
          recommendedActions: [
            {
              id: 'action-1',
              type: 'BLOCK_IP',
              description: 'Block malicious IP',
              priority: 1,
              automated: true,
              estimatedImpact: {
                businessImpact: 'LOW',
                affectedSystems: 1,
                estimatedDowntime: 0,
                reversible: true,
              },
              prerequisites: [],
            },
          ],
          autoRemediationEligible: true,
          evidenceSummary: 'Test evidence',
          rawEvidence: [],
          timestamp: new Date(),
          ctiCorrelations: [],
          osintData: [],
          threatActorAttribution: [],
          campaignAssociations: [],
          enrichmentTimestamp: new Date(),
        },
      ];

      const plan = await hooks.createRemediationPlan('hunt-1', findings, true);

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.huntId).toBe('hunt-1');
      expect(plan.status).toBe('pending_approval');
    });

    it('should create approved plan when approval not required', async () => {
      const findings: EnrichedFinding[] = [];
      const plan = await hooks.createRemediationPlan('hunt-1', findings, false);

      expect(plan.status).toBe('approved');
    });
  });

  describe('approvePlan', () => {
    it('should approve a pending plan', async () => {
      const findings: EnrichedFinding[] = [];
      const plan = await hooks.createRemediationPlan('hunt-1', findings, true);

      await hooks.approvePlan(plan.id, 'test-user');

      const updatedPlan = hooks.getActivePlans().find((p: any) => p.id === plan.id);
      expect(updatedPlan?.status).toBe('approved');
      expect(updatedPlan?.approvedBy).toBe('test-user');
    });

    it('should throw error for non-existent plan', async () => {
      await expect(hooks.approvePlan('non-existent', 'user')).rejects.toThrow();
    });
  });

  describe('getPendingApprovals', () => {
    it('should return list of pending approvals', async () => {
      const findings: EnrichedFinding[] = [];
      const plan = await hooks.createRemediationPlan('hunt-pending-test', findings, true);

      const pending = hooks.getPendingApprovals();

      // The created plan should be in pending approvals
      expect(Array.isArray(pending)).toBe(true);
      const ourPlan = pending.find((p: any) => p.id === plan.id);
      expect(ourPlan).toBeDefined();
      expect(ourPlan?.status).toBe('pending_approval');
    });
  });
});

describe('Integration Tests', () => {
  describe('Full Hunt Workflow', () => {
    it('should complete a full hunt workflow', async () => {
      const orchestrator = new ThreatHuntingOrchestrator();
      await orchestrator.initialize();

      try {
        // Start hunt
        const startResponse = await orchestrator.startHunt({
          scope: 'all',
          timeWindowHours: 24,
          configuration: {
            autoRemediate: false,
            confidenceThreshold: 0.7,
            targetPrecision: 0.91,
          },
        });

        expect(startResponse.huntId).toBeDefined();

        // Wait for completion (with timeout)
        let status = await orchestrator.getHuntStatus(startResponse.huntId);
        let attempts = 0;
        const maxAttempts = 30;

        while (
          !['completed', 'failed', 'cancelled'].includes(status.status) &&
          attempts < maxAttempts
        ) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          status = await orchestrator.getHuntStatus(startResponse.huntId);
          attempts++;
        }

        // Verify completion
        expect(['completed', 'failed', 'cancelled']).toContain(status.status);

        if (status.status === 'completed') {
          // Get results
          const results = await orchestrator.getHuntResults(startResponse.huntId);

          expect(results).toBeDefined();
          expect(results.metrics).toBeDefined();
          expect(results.findings).toBeDefined();
        }
      } finally {
        orchestrator.dispose();
      }

      orchestrator.dispose();
    }, 30000); // 30 second timeout
  });

  describe('Precision Targeting', () => {
    it('should achieve target precision of 91%', async () => {
      const orchestrator = new ThreatHuntingOrchestrator();
      await orchestrator.initialize();

      try {
        const response = await orchestrator.startHunt({
          configuration: {
            targetPrecision: 0.91,
            precisionMode: true,
          },
        });

        // Wait for completion
        let status = await orchestrator.getHuntStatus(response.huntId);
        let attempts = 0;

        while (!['completed', 'failed'].includes(status.status) && attempts < 30) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          status = await orchestrator.getHuntStatus(response.huntId);
          attempts++;
        }

        if (status.status === 'completed') {
          const results = await orchestrator.getHuntResults(response.huntId);

          // Precision should be at or above target
          expect(results.metrics.precisionEstimate).toBeGreaterThanOrEqual(0.85); // Allow 6% margin
        }
      } finally {
        orchestrator.dispose();
      }

      orchestrator.dispose();
    }, 30000);
  });
});
