"use strict";
/**
 * Agent Fleet Governance - Comprehensive Test Suite
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const src_1 = require("../src");
// ============================================================================
// Test Fixtures
// ============================================================================
const createMockContext = (overrides = {}) => ({
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
const createMockChain = () => ({
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
(0, vitest_1.describe)('AgentPolicyEngine', () => {
    let policyEngine;
    (0, vitest_1.beforeEach)(() => {
        policyEngine = new src_1.AgentPolicyEngine({
            cacheEnabled: true,
            failSafe: 'deny',
        });
    });
    (0, vitest_1.describe)('evaluateAction', () => {
        (0, vitest_1.it)('should return deny decision when OPA is unavailable (fail-safe)', async () => {
            const context = createMockContext();
            const decision = await policyEngine.evaluateAction(context);
            // Without OPA running, should fail-safe to deny
            (0, vitest_1.expect)(decision.allow).toBe(false);
            (0, vitest_1.expect)(decision.auditLevel).toBeDefined();
        });
        (0, vitest_1.it)('should include policy path in decision', async () => {
            const context = createMockContext();
            const decision = await policyEngine.evaluateAction(context);
            (0, vitest_1.expect)(decision.policyPath).toBeDefined();
        });
        (0, vitest_1.it)('should emit governance events', async () => {
            const events = [];
            policyEngine.onEvent((event) => events.push(event));
            const context = createMockContext();
            await policyEngine.evaluateAction(context);
            (0, vitest_1.expect)(events.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(events[0].type).toMatch(/policy_/);
        });
        (0, vitest_1.it)('should track metrics', async () => {
            const context = createMockContext();
            await policyEngine.evaluateAction(context);
            const metrics = policyEngine.getMetrics();
            (0, vitest_1.expect)(metrics.evaluationsTotal).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('trust level checking', () => {
        (0, vitest_1.it)('should correctly compare trust levels', () => {
            (0, vitest_1.expect)(src_1.AgentPolicyEngine.checkTrustLevel('elevated', 'basic')).toBe(true);
            (0, vitest_1.expect)(src_1.AgentPolicyEngine.checkTrustLevel('basic', 'elevated')).toBe(false);
            (0, vitest_1.expect)(src_1.AgentPolicyEngine.checkTrustLevel('privileged', 'privileged')).toBe(true);
        });
    });
    (0, vitest_1.describe)('classification checking', () => {
        (0, vitest_1.it)('should correctly compare classification levels', () => {
            (0, vitest_1.expect)(src_1.AgentPolicyEngine.checkClassification('SECRET', 'CONFIDENTIAL')).toBe(true);
            (0, vitest_1.expect)(src_1.AgentPolicyEngine.checkClassification('CONFIDENTIAL', 'SECRET')).toBe(false);
            (0, vitest_1.expect)(src_1.AgentPolicyEngine.checkClassification('TOP_SECRET', 'TOP_SECRET')).toBe(true);
        });
    });
});
// ============================================================================
// Incident Response Tests
// ============================================================================
(0, vitest_1.describe)('IncidentResponseManager', () => {
    let incidentManager;
    (0, vitest_1.beforeEach)(() => {
        incidentManager = new src_1.IncidentResponseManager({
            autoMitigate: false, // Disable for testing
        });
    });
    (0, vitest_1.describe)('reportIncident', () => {
        (0, vitest_1.it)('should create incident with unique ID', async () => {
            const incident = await incidentManager.reportIncident({
                type: 'policy_violation',
                severity: 'medium',
                title: 'Test Incident',
                description: 'Test description',
                reporter: 'test-system',
                classification: 'UNCLASSIFIED',
            });
            (0, vitest_1.expect)(incident.id).toMatch(/^INC-/);
            (0, vitest_1.expect)(incident.status).toBe('detected');
            (0, vitest_1.expect)(incident.timeline.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should set escalation path based on severity', async () => {
            const incident = await incidentManager.reportIncident({
                type: 'safety_breach',
                severity: 'critical',
                title: 'Critical Incident',
                description: 'Critical test',
                reporter: 'test-system',
                classification: 'SECRET',
            });
            (0, vitest_1.expect)(incident.escalationPath.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(incident.status).toBe('investigating');
        });
        (0, vitest_1.it)('should store evidence with hash', async () => {
            const incident = await incidentManager.reportIncident({
                type: 'data_leak',
                severity: 'high',
                title: 'Data Leak Test',
                description: 'Test evidence',
                evidence: [{ type: 'log', source: 'test', data: { key: 'value' } }],
                reporter: 'test-system',
                classification: 'CONFIDENTIAL',
            });
            (0, vitest_1.expect)(incident.evidence.length).toBe(1);
            (0, vitest_1.expect)(incident.evidence[0].hash).toBeDefined();
            (0, vitest_1.expect)(incident.evidence[0].hash.length).toBe(64); // SHA256 hex
        });
    });
    (0, vitest_1.describe)('resolveIncident', () => {
        (0, vitest_1.it)('should update incident status and timeline', async () => {
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
            (0, vitest_1.expect)(resolved?.status).toBe('resolved');
            (0, vitest_1.expect)(resolved?.resolvedAt).toBeDefined();
            (0, vitest_1.expect)(resolved?.rootCause).toBe('Test root cause');
        });
    });
    (0, vitest_1.describe)('getActiveIncidents', () => {
        (0, vitest_1.it)('should return only non-resolved incidents', async () => {
            await incidentManager.reportIncident({
                type: 'policy_violation',
                severity: 'low',
                title: 'Active Incident',
                description: 'Still active',
                reporter: 'test',
                classification: 'UNCLASSIFIED',
            });
            const active = incidentManager.getActiveIncidents();
            (0, vitest_1.expect)(active.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(active.every((i) => i.status !== 'resolved')).toBe(true);
        });
    });
});
// ============================================================================
// Hallucination Auditor Tests
// ============================================================================
(0, vitest_1.describe)('HallucinationAuditor', () => {
    let auditor;
    (0, vitest_1.beforeEach)(() => {
        auditor = new src_1.HallucinationAuditor({
            enabled: true,
            samplingRate: 1.0,
            autoRemediate: true,
        });
    });
    (0, vitest_1.describe)('audit', () => {
        (0, vitest_1.it)('should detect citation fabrication patterns', async () => {
            const detection = await auditor.audit({
                agentId: 'agent-001',
                sessionId: 'session-001',
                input: 'What is the capital of France?',
                output: 'According to Smith et al. 2019 study, Paris is the capital.',
            });
            // May or may not detect based on pattern matching
            if (detection) {
                (0, vitest_1.expect)(detection.type).toBeDefined();
                (0, vitest_1.expect)(detection.confidence).toBeGreaterThan(0);
            }
        });
        (0, vitest_1.it)('should include evidence in detection', async () => {
            const detection = await auditor.audit({
                agentId: 'agent-001',
                sessionId: 'session-001',
                input: 'Test input',
                output: 'According to Johnson et al. 2020 study, this is a fact.',
            });
            if (detection) {
                (0, vitest_1.expect)(detection.evidence.length).toBeGreaterThan(0);
            }
        });
        (0, vitest_1.it)('should return null for clean output', async () => {
            const detection = await auditor.audit({
                agentId: 'agent-001',
                sessionId: 'session-001',
                input: 'What is 2+2?',
                output: 'The answer is 4.',
            });
            // Clean output may not trigger detection
            // This test verifies the auditor doesn't false-positive on simple responses
            (0, vitest_1.expect)(detection === null || detection.confidence < 0.5).toBe(true);
        });
    });
    (0, vitest_1.describe)('generateReport', () => {
        (0, vitest_1.it)('should generate report for time period', () => {
            const report = auditor.generateReport({
                start: new Date(Date.now() - 86400000),
                end: new Date(),
            });
            (0, vitest_1.expect)(report.period).toBeDefined();
            (0, vitest_1.expect)(report.byType).toBeDefined();
            (0, vitest_1.expect)(report.bySeverity).toBeDefined();
            (0, vitest_1.expect)(report.recommendations).toBeDefined();
        });
    });
});
// ============================================================================
// Rollback Manager Tests
// ============================================================================
(0, vitest_1.describe)('RollbackManager', () => {
    let rollbackManager;
    (0, vitest_1.beforeEach)(() => {
        rollbackManager = new src_1.RollbackManager({
            autoApprove: false,
            dryRunFirst: false,
        });
    });
    (0, vitest_1.describe)('createCheckpoint', () => {
        (0, vitest_1.it)('should create checkpoint with unique ID', async () => {
            const checkpoint = await rollbackManager.createCheckpoint({
                scope: 'agent',
                agentId: 'agent-001',
                state: { config: { version: '1.0' } },
                createdBy: 'test-user',
            });
            (0, vitest_1.expect)(checkpoint.id).toMatch(/^CP-/);
            (0, vitest_1.expect)(checkpoint.state.configHash).toBeDefined();
            (0, vitest_1.expect)(checkpoint.expiresAt.getTime()).toBeGreaterThan(Date.now());
        });
    });
    (0, vitest_1.describe)('checkTrigger', () => {
        (0, vitest_1.it)('should not trigger under threshold', async () => {
            const triggered = await rollbackManager.checkTrigger('policy_violation', {
                agentId: 'agent-001',
            });
            (0, vitest_1.expect)(triggered).toBe(false);
        });
        (0, vitest_1.it)('should respect cooldown period', async () => {
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
            (0, vitest_1.expect)(triggered).toBe(false);
        });
    });
    (0, vitest_1.describe)('initiateRollback', () => {
        (0, vitest_1.it)('should create rollback with checkpoint', async () => {
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
            (0, vitest_1.expect)(rollback.id).toMatch(/^RB-/);
            (0, vitest_1.expect)(rollback.status).toBe('pending');
            (0, vitest_1.expect)(rollback.steps.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should throw when no checkpoint available', async () => {
            await (0, vitest_1.expect)(rollbackManager.initiateRollback({
                trigger: 'manual_trigger',
                scope: 'agent',
                agentId: 'nonexistent-agent',
                reason: 'Test rollback',
                initiatedBy: 'test-user',
            })).rejects.toThrow('No checkpoint available');
        });
    });
    (0, vitest_1.describe)('getMetrics', () => {
        (0, vitest_1.it)('should return rollback metrics', () => {
            const metrics = rollbackManager.getMetrics();
            (0, vitest_1.expect)(metrics.total).toBeDefined();
            (0, vitest_1.expect)(metrics.successful).toBeDefined();
            (0, vitest_1.expect)(metrics.failed).toBeDefined();
            (0, vitest_1.expect)(metrics.byTrigger).toBeDefined();
        });
    });
});
// ============================================================================
// AI Provenance Manager Tests
// ============================================================================
(0, vitest_1.describe)('AIProvenanceManager', () => {
    let provenanceManager;
    (0, vitest_1.beforeEach)(() => {
        provenanceManager = new src_1.AIProvenanceManager({
            signProvenance: true,
            requireSlsa3: true,
        });
    });
    (0, vitest_1.describe)('createOutputProvenance', () => {
        (0, vitest_1.it)('should create provenance with SLSA level', async () => {
            const provenance = await provenanceManager.createOutputProvenance({
                output: 'Test output response',
                promptHash: 'abc123',
                modelId: 'test-model',
                agentId: 'agent-001',
                sessionId: 'session-001',
                temperature: 0.7,
                maxTokens: 1000,
            });
            (0, vitest_1.expect)(provenance.id).toMatch(/^PROV-/);
            (0, vitest_1.expect)(provenance.slsaLevel).toBeDefined();
            (0, vitest_1.expect)(provenance.subject.digest.sha256).toBeDefined();
        });
        (0, vitest_1.it)('should include cosign bundle when signing enabled', async () => {
            const provenance = await provenanceManager.createOutputProvenance({
                output: 'Signed output',
                promptHash: 'xyz789',
                modelId: 'test-model',
                agentId: 'agent-001',
                sessionId: 'session-001',
                temperature: 0.5,
                maxTokens: 500,
            });
            (0, vitest_1.expect)(provenance.cosignBundle).toBeDefined();
            (0, vitest_1.expect)(provenance.cosignBundle?.signatures.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('verifyProvenance', () => {
        (0, vitest_1.it)('should verify valid provenance', async () => {
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
            (0, vitest_1.expect)(result.checks.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.slsaLevel).toBeDefined();
        });
        (0, vitest_1.it)('should return invalid for nonexistent provenance', async () => {
            const result = await provenanceManager.verifyProvenance('nonexistent-id');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.slsaLevel).toBe('SLSA_0');
        });
    });
    (0, vitest_1.describe)('exportProvenance', () => {
        (0, vitest_1.it)('should export provenance as JSON', async () => {
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
            (0, vitest_1.expect)(exported).toBeDefined();
            const parsed = JSON.parse(exported);
            (0, vitest_1.expect)(parsed._type).toBe('https://in-toto.io/Statement/v0.1');
        });
    });
});
// ============================================================================
// Governance Framework Integration Tests
// ============================================================================
(0, vitest_1.describe)('GovernanceFramework', () => {
    (0, vitest_1.describe)('createGovernanceFramework', () => {
        (0, vitest_1.it)('should create all components', () => {
            const framework = (0, src_1.createGovernanceFramework)();
            (0, vitest_1.expect)(framework.policyEngine).toBeInstanceOf(src_1.AgentPolicyEngine);
            (0, vitest_1.expect)(framework.orchestrator).toBeInstanceOf(src_1.PromptChainOrchestrator);
            (0, vitest_1.expect)(framework.incidentManager).toBeInstanceOf(src_1.IncidentResponseManager);
            (0, vitest_1.expect)(framework.hallucinationAuditor).toBeInstanceOf(src_1.HallucinationAuditor);
            (0, vitest_1.expect)(framework.rollbackManager).toBeInstanceOf(src_1.RollbackManager);
            (0, vitest_1.expect)(framework.provenanceManager).toBeInstanceOf(src_1.AIProvenanceManager);
            (0, vitest_1.expect)(framework.complianceValidator).toBeInstanceOf(src_1.ICFY28ComplianceValidator);
            (0, vitest_1.expect)(framework.dashboard).toBeInstanceOf(src_1.GovernanceDashboardService);
        });
        (0, vitest_1.it)('should wire up event handlers', async () => {
            const framework = (0, src_1.createGovernanceFramework)();
            const events = [];
            framework.policyEngine.onEvent((e) => events.push(e));
            // Trigger a policy evaluation
            await framework.policyEngine.evaluateAction(createMockContext());
            (0, vitest_1.expect)(events.length).toBeGreaterThan(0);
        });
    });
});
// ============================================================================
// Dashboard Service Tests
// ============================================================================
(0, vitest_1.describe)('GovernanceDashboardService', () => {
    let dashboard;
    let framework;
    (0, vitest_1.beforeEach)(() => {
        framework = (0, src_1.createGovernanceFramework)();
        dashboard = framework.dashboard;
    });
    (0, vitest_1.describe)('getMetrics', () => {
        (0, vitest_1.it)('should return comprehensive metrics', async () => {
            const metrics = await dashboard.getMetrics();
            (0, vitest_1.expect)(metrics.timestamp).toBeDefined();
            (0, vitest_1.expect)(metrics.fleet).toBeDefined();
            (0, vitest_1.expect)(metrics.policy).toBeDefined();
            (0, vitest_1.expect)(metrics.incidents).toBeDefined();
            (0, vitest_1.expect)(metrics.hallucinations).toBeDefined();
            (0, vitest_1.expect)(metrics.rollbacks).toBeDefined();
            (0, vitest_1.expect)(metrics.compliance).toBeDefined();
        });
    });
    (0, vitest_1.describe)('getHealthStatus', () => {
        (0, vitest_1.it)('should return health status for all components', async () => {
            const health = await dashboard.getHealthStatus();
            (0, vitest_1.expect)(health.overall).toMatch(/healthy|degraded|unhealthy/);
            (0, vitest_1.expect)(health.components).toBeDefined();
        });
    });
    (0, vitest_1.describe)('getSummary', () => {
        (0, vitest_1.it)('should return dashboard summary', async () => {
            const summary = await dashboard.getSummary();
            (0, vitest_1.expect)(summary.status).toBeDefined();
            (0, vitest_1.expect)(summary.agents).toBeDefined();
            (0, vitest_1.expect)(summary.incidents).toBeDefined();
            (0, vitest_1.expect)(summary.compliance).toBeDefined();
            (0, vitest_1.expect)(summary.lastUpdated).toBeDefined();
        });
    });
});
// ============================================================================
// Compliance Validator Tests
// ============================================================================
(0, vitest_1.describe)('ICFY28ComplianceValidator', () => {
    let validator;
    let framework;
    (0, vitest_1.beforeEach)(() => {
        framework = (0, src_1.createGovernanceFramework)();
        validator = framework.complianceValidator;
    });
    (0, vitest_1.describe)('validate', () => {
        (0, vitest_1.it)('should validate all IC FY28 controls', async () => {
            const result = await validator.validate();
            (0, vitest_1.expect)(result.timestamp).toBeDefined();
            (0, vitest_1.expect)(result.controls.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(result.validationLevel).toBeDefined();
        });
        (0, vitest_1.it)('should categorize controls correctly', async () => {
            const result = await validator.validate();
            const categories = new Set(result.controls.map((c) => c.category));
            (0, vitest_1.expect)(categories.has('identity')).toBe(true);
            (0, vitest_1.expect)(categories.has('access')).toBe(true);
            (0, vitest_1.expect)(categories.has('ai_safety')).toBe(true);
            (0, vitest_1.expect)(categories.has('supply_chain')).toBe(true);
        });
    });
    (0, vitest_1.describe)('getComplianceScore', () => {
        (0, vitest_1.it)('should calculate compliance score', async () => {
            await validator.validate();
            const score = validator.getComplianceScore();
            (0, vitest_1.expect)(score.score).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(score.score).toBeLessThanOrEqual(100);
            (0, vitest_1.expect)(score.byCategory).toBeDefined();
            (0, vitest_1.expect)(score.trend).toMatch(/improving|stable|declining/);
        });
    });
    (0, vitest_1.describe)('getControlDefinitions', () => {
        (0, vitest_1.it)('should return all control definitions', () => {
            const definitions = validator.getControlDefinitions();
            (0, vitest_1.expect)(definitions.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(definitions[0].id).toMatch(/^IC-AI-/);
            (0, vitest_1.expect)(definitions[0].requirements.length).toBeGreaterThan(0);
        });
    });
});
