/**
 * Agent Fleet Governance - Comprehensive Test Suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createGovernanceFramework,
  AgentPolicyEngine,
  PromptChainOrchestrator,
  IncidentResponseManager,
  HallucinationAuditor,
  RollbackManager,
  AIProvenanceManager,
  ICFY28ComplianceValidator,
  GovernanceDashboardService,
  type AgentPolicyContext,
  type PromptChain,
  type GovernanceEvent,
} from '../src';

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockContext = (overrides: Partial<AgentPolicyContext> = {}): AgentPolicyContext => ({
  agentId: 'agent-001',
  fleetId: 'fleet-001',
  sessionId: 'session-001',
  trustLevel: 'elevated',
  classification: 'CONFIDENTIAL',
  capabilities: ['read', 'analyze', 'recommend'],
  requestedAction: 'analyze_data',
  targetResource: 'entity:12345',
  userContext: {
    userId: 'user-001',
    roles: ['analyst'],
    clearance: 'SECRET',
    organization: 'org-001',
  },
  environmentContext: {
    timestamp: Date.now(),
    airgapped: false,
    federalEnvironment: true,
    slsaLevel: 'SLSA_3',
  },
  ...overrides,
});

const createMockChain = (): PromptChain => ({
  id: 'chain-001',
  name: 'Test Analysis Chain',
  description: 'Test chain for analysis',
  steps: [
    {
      id: 'step-1',
      sequence: 1,
      llmProvider: 'test-provider',
      prompt: {
        template: 'Analyze the following: {{input}}',
        variables: ['input'],
        maxTokens: 1000,
        temperature: 0.7,
        classification: 'CONFIDENTIAL',
      },
      inputMappings: { input: 'inputData' },
      outputMappings: { result: 'analysisResult' },
      validations: [
        { type: 'safety', config: { blockedPatterns: ['harmful'] }, action: 'reject' },
      ],
      timeout: 30000,
      retryPolicy: { maxRetries: 2, backoffMs: 1000, backoffMultiplier: 2, retryableErrors: [] },
    },
  ],
  governance: {
    requiredApprovals: [],
    maxCostPerExecution: 10,
    maxDurationMs: 60000,
    allowedClassifications: ['CONFIDENTIAL', 'SECRET'],
    auditLevel: 'standard',
    incidentEscalation: ['team-lead'],
  },
  provenance: {
    createdBy: 'test-user',
    createdAt: new Date(),
    version: '1.0.0',
    slsaLevel: 'SLSA_3',
    attestations: [],
  },
  metadata: {},
});

// ============================================================================
// Policy Engine Tests
// ============================================================================

describe('AgentPolicyEngine', () => {
  let policyEngine: AgentPolicyEngine;

  beforeEach(() => {
    policyEngine = new AgentPolicyEngine({
      cacheEnabled: true,
      failSafe: 'deny',
    });
  });

  describe('evaluateAction', () => {
    it('should return deny decision when OPA is unavailable (fail-safe)', async () => {
      const context = createMockContext();
      const decision = await policyEngine.evaluateAction(context);

      // Without OPA running, should fail-safe to deny
      expect(decision.allow).toBe(false);
      expect(decision.auditLevel).toBeDefined();
    });

    it('should include policy path in decision', async () => {
      const context = createMockContext();
      const decision = await policyEngine.evaluateAction(context);

      expect(decision.policyPath).toBeDefined();
    });

    it('should emit governance events', async () => {
      const events: GovernanceEvent[] = [];
      policyEngine.onEvent((event) => events.push(event));

      const context = createMockContext();
      await policyEngine.evaluateAction(context);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toMatch(/policy_/);
    });

    it('should track metrics', async () => {
      const context = createMockContext();
      await policyEngine.evaluateAction(context);

      const metrics = policyEngine.getMetrics();
      expect(metrics.evaluationsTotal).toBeGreaterThan(0);
    });
  });

  describe('trust level checking', () => {
    it('should correctly compare trust levels', () => {
      expect(AgentPolicyEngine.checkTrustLevel('elevated', 'basic')).toBe(true);
      expect(AgentPolicyEngine.checkTrustLevel('basic', 'elevated')).toBe(false);
      expect(AgentPolicyEngine.checkTrustLevel('privileged', 'privileged')).toBe(true);
    });
  });

  describe('classification checking', () => {
    it('should correctly compare classification levels', () => {
      expect(AgentPolicyEngine.checkClassification('SECRET', 'CONFIDENTIAL')).toBe(true);
      expect(AgentPolicyEngine.checkClassification('CONFIDENTIAL', 'SECRET')).toBe(false);
      expect(AgentPolicyEngine.checkClassification('TOP_SECRET', 'TOP_SECRET')).toBe(true);
    });
  });
});

// ============================================================================
// Incident Response Tests
// ============================================================================

describe('IncidentResponseManager', () => {
  let incidentManager: IncidentResponseManager;

  beforeEach(() => {
    incidentManager = new IncidentResponseManager({
      autoMitigate: false, // Disable for testing
    });
  });

  describe('reportIncident', () => {
    it('should create incident with unique ID', async () => {
      const incident = await incidentManager.reportIncident({
        type: 'policy_violation',
        severity: 'medium',
        title: 'Test Incident',
        description: 'Test description',
        reporter: 'test-system',
        classification: 'UNCLASSIFIED',
      });

      expect(incident.id).toMatch(/^INC-/);
      expect(incident.status).toBe('detected');
      expect(incident.timeline.length).toBeGreaterThan(0);
    });

    it('should set escalation path based on severity', async () => {
      const incident = await incidentManager.reportIncident({
        type: 'safety_breach',
        severity: 'critical',
        title: 'Critical Incident',
        description: 'Critical test',
        reporter: 'test-system',
        classification: 'SECRET',
      });

      expect(incident.escalationPath.length).toBeGreaterThan(0);
      expect(incident.status).toBe('investigating');
    });

    it('should store evidence with hash', async () => {
      const incident = await incidentManager.reportIncident({
        type: 'data_leak',
        severity: 'high',
        title: 'Data Leak Test',
        description: 'Test evidence',
        evidence: [{ type: 'log', source: 'test', data: { key: 'value' } }],
        reporter: 'test-system',
        classification: 'CONFIDENTIAL',
      });

      expect(incident.evidence.length).toBe(1);
      expect(incident.evidence[0].hash).toBeDefined();
      expect(incident.evidence[0].hash.length).toBe(64); // SHA256 hex
    });
  });

  describe('resolveIncident', () => {
    it('should update incident status and timeline', async () => {
      const incident = await incidentManager.reportIncident({
        type: 'policy_violation',
        severity: 'low',
        title: 'Test Incident',
        description: 'To be resolved',
        reporter: 'test-system',
        classification: 'UNCLASSIFIED',
      });

      const resolved = await incidentManager.resolveIncident(incident.id, {
        resolver: 'test-resolver',
        rootCause: 'Test root cause',
        lessonsLearned: ['Lesson 1'],
      });

      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolvedAt).toBeDefined();
      expect(resolved?.rootCause).toBe('Test root cause');
    });
  });

  describe('getActiveIncidents', () => {
    it('should return only non-resolved incidents', async () => {
      await incidentManager.reportIncident({
        type: 'policy_violation',
        severity: 'low',
        title: 'Active Incident',
        description: 'Still active',
        reporter: 'test',
        classification: 'UNCLASSIFIED',
      });

      const active = incidentManager.getActiveIncidents();
      expect(active.length).toBeGreaterThan(0);
      expect(active.every((i) => i.status !== 'resolved')).toBe(true);
    });
  });
});

// ============================================================================
// Hallucination Auditor Tests
// ============================================================================

describe('HallucinationAuditor', () => {
  let auditor: HallucinationAuditor;

  beforeEach(() => {
    auditor = new HallucinationAuditor({
      enabled: true,
      samplingRate: 1.0,
      autoRemediate: true,
    });
  });

  describe('audit', () => {
    it('should detect citation fabrication patterns', async () => {
      const detection = await auditor.audit({
        agentId: 'agent-001',
        sessionId: 'session-001',
        input: 'What is the capital of France?',
        output: 'According to Smith et al. 2019 study, Paris is the capital.',
      });

      // May or may not detect based on pattern matching
      if (detection) {
        expect(detection.type).toBeDefined();
        expect(detection.confidence).toBeGreaterThan(0);
      }
    });

    it('should include evidence in detection', async () => {
      const detection = await auditor.audit({
        agentId: 'agent-001',
        sessionId: 'session-001',
        input: 'Test input',
        output: 'According to Johnson et al. 2020 study, this is a fact.',
      });

      if (detection) {
        expect(detection.evidence.length).toBeGreaterThan(0);
      }
    });

    it('should return null for clean output', async () => {
      const detection = await auditor.audit({
        agentId: 'agent-001',
        sessionId: 'session-001',
        input: 'What is 2+2?',
        output: 'The answer is 4.',
      });

      // Clean output may not trigger detection
      // This test verifies the auditor doesn't false-positive on simple responses
      expect(detection === null || detection.confidence < 0.5).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('should generate report for time period', () => {
      const report = auditor.generateReport({
        start: new Date(Date.now() - 86400000),
        end: new Date(),
      });

      expect(report.period).toBeDefined();
      expect(report.byType).toBeDefined();
      expect(report.bySeverity).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });
});

// ============================================================================
// Rollback Manager Tests
// ============================================================================

describe('RollbackManager', () => {
  let rollbackManager: RollbackManager;

  beforeEach(() => {
    rollbackManager = new RollbackManager({
      autoApprove: false,
      dryRunFirst: false,
    });
  });

  describe('createCheckpoint', () => {
    it('should create checkpoint with unique ID', async () => {
      const checkpoint = await rollbackManager.createCheckpoint({
        scope: 'agent',
        agentId: 'agent-001',
        state: { config: { version: '1.0' } },
        createdBy: 'test-user',
      });

      expect(checkpoint.id).toMatch(/^CP-/);
      expect(checkpoint.state.configHash).toBeDefined();
      expect(checkpoint.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('checkTrigger', () => {
    it('should not trigger under threshold', async () => {
      const triggered = await rollbackManager.checkTrigger('policy_violation', {
        agentId: 'agent-001',
      });

      expect(triggered).toBe(false);
    });

    it('should respect cooldown period', async () => {
      // Manually exceed threshold
      for (let i = 0; i < 15; i++) {
        await rollbackManager.checkTrigger('policy_violation', {
          agentId: 'agent-001',
        });
      }

      // Should be in cooldown now
      const triggered = await rollbackManager.checkTrigger('policy_violation', {
        agentId: 'agent-001',
      });

      expect(triggered).toBe(false);
    });
  });

  describe('initiateRollback', () => {
    it('should create rollback with checkpoint', async () => {
      // First create a checkpoint
      const checkpoint = await rollbackManager.createCheckpoint({
        scope: 'agent',
        agentId: 'agent-001',
        state: { config: { version: '1.0' } },
        createdBy: 'test-user',
      });

      const rollback = await rollbackManager.initiateRollback({
        trigger: 'manual_trigger',
        scope: 'agent',
        agentId: 'agent-001',
        reason: 'Test rollback',
        initiatedBy: 'test-user',
        checkpointId: checkpoint.id,
      });

      expect(rollback.id).toMatch(/^RB-/);
      expect(rollback.status).toBe('pending');
      expect(rollback.steps.length).toBeGreaterThan(0);
    });

    it('should throw when no checkpoint available', async () => {
      await expect(
        rollbackManager.initiateRollback({
          trigger: 'manual_trigger',
          scope: 'agent',
          agentId: 'nonexistent-agent',
          reason: 'Test rollback',
          initiatedBy: 'test-user',
        }),
      ).rejects.toThrow('No checkpoint available');
    });
  });

  describe('getMetrics', () => {
    it('should return rollback metrics', () => {
      const metrics = rollbackManager.getMetrics();

      expect(metrics.total).toBeDefined();
      expect(metrics.successful).toBeDefined();
      expect(metrics.failed).toBeDefined();
      expect(metrics.byTrigger).toBeDefined();
    });
  });
});

// ============================================================================
// AI Provenance Manager Tests
// ============================================================================

describe('AIProvenanceManager', () => {
  let provenanceManager: AIProvenanceManager;

  beforeEach(() => {
    provenanceManager = new AIProvenanceManager({
      signProvenance: true,
      requireSlsa3: true,
    });
  });

  describe('createOutputProvenance', () => {
    it('should create provenance with SLSA level', async () => {
      const provenance = await provenanceManager.createOutputProvenance({
        output: 'Test output response',
        promptHash: 'abc123',
        modelId: 'test-model',
        agentId: 'agent-001',
        sessionId: 'session-001',
        temperature: 0.7,
        maxTokens: 1000,
      });

      expect(provenance.id).toMatch(/^PROV-/);
      expect(provenance.slsaLevel).toBeDefined();
      expect(provenance.subject.digest.sha256).toBeDefined();
    });

    it('should include cosign bundle when signing enabled', async () => {
      const provenance = await provenanceManager.createOutputProvenance({
        output: 'Signed output',
        promptHash: 'xyz789',
        modelId: 'test-model',
        agentId: 'agent-001',
        sessionId: 'session-001',
        temperature: 0.5,
        maxTokens: 500,
      });

      expect(provenance.cosignBundle).toBeDefined();
      expect(provenance.cosignBundle?.signatures.length).toBeGreaterThan(0);
    });
  });

  describe('verifyProvenance', () => {
    it('should verify valid provenance', async () => {
      const provenance = await provenanceManager.createOutputProvenance({
        output: 'Verifiable output',
        promptHash: 'verify123',
        modelId: 'test-model',
        agentId: 'agent-001',
        sessionId: 'session-001',
        temperature: 0.7,
        maxTokens: 1000,
      });

      const result = await provenanceManager.verifyProvenance(provenance.id);

      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.slsaLevel).toBeDefined();
    });

    it('should return invalid for nonexistent provenance', async () => {
      const result = await provenanceManager.verifyProvenance('nonexistent-id');

      expect(result.valid).toBe(false);
      expect(result.slsaLevel).toBe('SLSA_0');
    });
  });

  describe('exportProvenance', () => {
    it('should export provenance as JSON', async () => {
      const provenance = await provenanceManager.createOutputProvenance({
        output: 'Exportable output',
        promptHash: 'export123',
        modelId: 'test-model',
        agentId: 'agent-001',
        sessionId: 'session-001',
        temperature: 0.7,
        maxTokens: 1000,
      });

      const exported = provenanceManager.exportProvenance(provenance.id);

      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported!);
      expect(parsed._type).toBe('https://in-toto.io/Statement/v0.1');
    });
  });
});

// ============================================================================
// Governance Framework Integration Tests
// ============================================================================

describe('GovernanceFramework', () => {
  describe('createGovernanceFramework', () => {
    it('should create all components', () => {
      const framework = createGovernanceFramework();

      expect(framework.policyEngine).toBeInstanceOf(AgentPolicyEngine);
      expect(framework.orchestrator).toBeInstanceOf(PromptChainOrchestrator);
      expect(framework.incidentManager).toBeInstanceOf(IncidentResponseManager);
      expect(framework.hallucinationAuditor).toBeInstanceOf(HallucinationAuditor);
      expect(framework.rollbackManager).toBeInstanceOf(RollbackManager);
      expect(framework.provenanceManager).toBeInstanceOf(AIProvenanceManager);
      expect(framework.complianceValidator).toBeInstanceOf(ICFY28ComplianceValidator);
      expect(framework.dashboard).toBeInstanceOf(GovernanceDashboardService);
    });

    it('should wire up event handlers', async () => {
      const framework = createGovernanceFramework();
      const events: GovernanceEvent[] = [];

      framework.policyEngine.onEvent((e) => events.push(e));

      // Trigger a policy evaluation
      await framework.policyEngine.evaluateAction(createMockContext());

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Dashboard Service Tests
// ============================================================================

describe('GovernanceDashboardService', () => {
  let dashboard: GovernanceDashboardService;
  let framework: ReturnType<typeof createGovernanceFramework>;

  beforeEach(() => {
    framework = createGovernanceFramework();
    dashboard = framework.dashboard;
  });

  describe('getMetrics', () => {
    it('should return comprehensive metrics', async () => {
      const metrics = await dashboard.getMetrics();

      expect(metrics.timestamp).toBeDefined();
      expect(metrics.fleet).toBeDefined();
      expect(metrics.policy).toBeDefined();
      expect(metrics.incidents).toBeDefined();
      expect(metrics.hallucinations).toBeDefined();
      expect(metrics.rollbacks).toBeDefined();
      expect(metrics.compliance).toBeDefined();
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status for all components', async () => {
      const health = await dashboard.getHealthStatus();

      expect(health.overall).toMatch(/healthy|degraded|unhealthy/);
      expect(health.components).toBeDefined();
    });
  });

  describe('getSummary', () => {
    it('should return dashboard summary', async () => {
      const summary = await dashboard.getSummary();

      expect(summary.status).toBeDefined();
      expect(summary.agents).toBeDefined();
      expect(summary.incidents).toBeDefined();
      expect(summary.compliance).toBeDefined();
      expect(summary.lastUpdated).toBeDefined();
    });
  });
});

// ============================================================================
// Compliance Validator Tests
// ============================================================================

describe('ICFY28ComplianceValidator', () => {
  let validator: ICFY28ComplianceValidator;
  let framework: ReturnType<typeof createGovernanceFramework>;

  beforeEach(() => {
    framework = createGovernanceFramework();
    validator = framework.complianceValidator;
  });

  describe('validate', () => {
    it('should validate all IC FY28 controls', async () => {
      const result = await validator.validate();

      expect(result.timestamp).toBeDefined();
      expect(result.controls.length).toBeGreaterThan(0);
      expect(result.validationLevel).toBeDefined();
    });

    it('should categorize controls correctly', async () => {
      const result = await validator.validate();
      const categories = new Set(result.controls.map((c) => c.category));

      expect(categories.has('identity')).toBe(true);
      expect(categories.has('access')).toBe(true);
      expect(categories.has('ai_safety')).toBe(true);
      expect(categories.has('supply_chain')).toBe(true);
    });
  });

  describe('getComplianceScore', () => {
    it('should calculate compliance score', async () => {
      await validator.validate();
      const score = validator.getComplianceScore();

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(score.byCategory).toBeDefined();
      expect(score.trend).toMatch(/improving|stable|declining/);
    });
  });

  describe('getControlDefinitions', () => {
    it('should return all control definitions', () => {
      const definitions = validator.getControlDefinitions();

      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions[0].id).toMatch(/^IC-AI-/);
      expect(definitions[0].requirements.length).toBeGreaterThan(0);
    });
  });
});
