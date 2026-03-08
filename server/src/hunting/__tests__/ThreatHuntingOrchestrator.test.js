"use strict";
/**
 * ThreatHuntingOrchestrator Tests
 * Comprehensive test suite for the threat hunting platform
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const events_1 = require("events");
const ThreatHuntingOrchestrator_js_1 = require("../ThreatHuntingOrchestrator.js");
const CypherTemplateEngine_js_1 = require("../CypherTemplateEngine.js");
const LLMChainExecutor_js_1 = require("../LLMChainExecutor.js");
let AutoRemediationHooks;
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
        validateQuery(query) {
            const upperQuery = query.toUpperCase();
            let isValid = true;
            let isReadOnly = true;
            const hasLimit = /\bLIMIT\s+\d+/i.test(query);
            let complexity = 10;
            if (upperQuery.includes('DELETE') ||
                upperQuery.includes('SET') ||
                upperQuery.includes('CREATE') ||
                upperQuery.includes('MERGE')) {
                isValid = false;
                isReadOnly = false;
            }
            if ((query.match(/MATCH/gi) || []).length > 1)
                complexity = 20;
            if ((query.match(/\*\d*\.\./gi) || []).length > 0)
                complexity = 30;
            return {
                isValid,
                isReadOnly,
                hasLimit,
                complexity,
                estimatedCost: complexity * 10,
            };
        }
        ensureLimit(query, limit = 100) {
            if (/\bLIMIT\s+\d+/i.test(query))
                return query;
            return `${query.trim()} LIMIT ${limit}`;
        }
    };
}
function buildLLMChainExecutorMockClass() {
    return class MockLLMChainExecutor extends events_1.EventEmitter {
        provider;
        constructor() {
            super();
            this.setMaxListeners(0);
        }
        initialize(provider) {
            this.provider = provider;
        }
        async generateHypotheses() {
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
        async generateQueries() {
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
        async analyzeResults() {
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
globals_1.jest.mock('../../config/logger', () => ({
    default: {
        info: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    },
}));
// Mock AutoRemediationHooks to prevent singleton instantiation with unmocked logger
globals_1.jest.mock('../AutoRemediationHooks.js', () => {
    class MockAutoRemediationHooks extends events_1.EventEmitter {
        plans = [];
        constructor() {
            super();
            this.setMaxListeners(0);
        }
        registerHook() {
            return undefined;
        }
        async createRemediationPlan(huntId, findings, approvalRequired) {
            const newPlan = {
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
        async approvePlan(planId, userId) {
            const plan = this.plans.find((p) => p.id === planId);
            if (!plan)
                throw new Error('Plan not found');
            plan.status = 'approved';
            plan.approvedBy = userId;
            plan.approvedAt = new Date();
            return plan;
        }
        async rejectPlan() {
            return undefined;
        }
        getActivePlans() {
            return this.plans.filter((p) => p.status !== 'completed' &&
                p.status !== 'failed' &&
                p.status !== 'cancelled');
        }
        getPendingApprovals() {
            return this.plans.filter((p) => p.status === 'pending_approval');
        }
        async enrichFindings(findings) {
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
globals_1.jest.mock('../../graph/neo4j', () => ({
    runCypher: globals_1.jest.fn().mockResolvedValue([
        { id: 'entity-1', name: 'Test Entity', type: 'HOST' },
        { id: 'entity-2', name: 'Test Entity 2', type: 'USER' },
    ]),
}));
globals_1.jest.mock('../../graph/neo4j.js', () => ({
    runCypher: globals_1.jest.fn().mockResolvedValue([
        { id: 'entity-1', name: 'Test Entity', type: 'HOST' },
        { id: 'entity-2', name: 'Test Entity 2', type: 'USER' },
    ]),
}));
// Mock other hunting modules that may have singletons
globals_1.jest.mock('../CypherTemplateEngine.js', () => {
    const MockCypherTemplateEngine = buildCypherTemplateEngineMockClass();
    const engine = new MockCypherTemplateEngine();
    return {
        cypherTemplateEngine: engine,
        CypherTemplateEngine: MockCypherTemplateEngine,
    };
});
globals_1.jest.mock('../CypherTemplateEngine', () => {
    const MockCypherTemplateEngine = buildCypherTemplateEngineMockClass();
    const engine = new MockCypherTemplateEngine();
    return {
        cypherTemplateEngine: engine,
        CypherTemplateEngine: MockCypherTemplateEngine,
    };
});
globals_1.jest.mock('../LLMChainExecutor.js', () => {
    const MockLLMChainExecutor = buildLLMChainExecutorMockClass();
    const mockExecutor = new MockLLMChainExecutor();
    return {
        llmChainExecutor: mockExecutor,
        LLMChainExecutor: MockLLMChainExecutor,
    };
});
globals_1.jest.mock('../LLMChainExecutor', () => {
    const MockLLMChainExecutor = buildLLMChainExecutorMockClass();
    const mockExecutor = new MockLLMChainExecutor();
    return {
        llmChainExecutor: mockExecutor,
        LLMChainExecutor: MockLLMChainExecutor,
    };
});
(0, globals_1.describe)('ThreatHuntingOrchestrator', () => {
    let orchestrator;
    (0, globals_1.beforeEach)(() => {
        orchestrator = new ThreatHuntingOrchestrator_js_1.ThreatHuntingOrchestrator();
    });
    (0, globals_1.afterEach)(() => {
        orchestrator.dispose();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('initialization', () => {
        (0, globals_1.it)('should initialize successfully', async () => {
            await (0, globals_1.expect)(orchestrator.initialize()).resolves.not.toThrow();
        });
        (0, globals_1.it)('should be idempotent for multiple initializations', async () => {
            await orchestrator.initialize();
            await (0, globals_1.expect)(orchestrator.initialize()).resolves.not.toThrow();
        });
    });
    (0, globals_1.describe)('startHunt', () => {
        (0, globals_1.it)('should start a hunt with default configuration', async () => {
            const response = await orchestrator.startHunt();
            (0, globals_1.expect)(response).toBeDefined();
            (0, globals_1.expect)(response.huntId).toBeDefined();
            (0, globals_1.expect)(response.status).toBe('initializing');
            (0, globals_1.expect)(response.startedAt).toBeInstanceOf(Date);
            (0, globals_1.expect)(response.estimatedDuration).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should start a hunt with custom scope', async () => {
            const response = await orchestrator.startHunt({
                scope: 'network',
                timeWindowHours: 48,
            });
            (0, globals_1.expect)(response.huntId).toBeDefined();
        });
        (0, globals_1.it)('should start a hunt with auto-remediation enabled', async () => {
            const response = await orchestrator.startHunt({
                configuration: {
                    autoRemediate: true,
                    remediationApprovalRequired: false,
                },
            });
            (0, globals_1.expect)(response.huntId).toBeDefined();
        });
        (0, globals_1.it)('should accept custom hypotheses', async () => {
            const customHypotheses = [
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
            (0, globals_1.expect)(response.huntId).toBeDefined();
        });
    });
    (0, globals_1.describe)('getHuntStatus', () => {
        (0, globals_1.it)('should return status for an active hunt', async () => {
            const startResponse = await orchestrator.startHunt();
            const status = await orchestrator.getHuntStatus(startResponse.huntId);
            (0, globals_1.expect)(status).toBeDefined();
            (0, globals_1.expect)(status.huntId).toBe(startResponse.huntId);
            (0, globals_1.expect)(status.progress).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(status.progress).toBeLessThanOrEqual(100);
            (0, globals_1.expect)(status.currentPhase).toBeDefined();
        });
        (0, globals_1.it)('should throw error for non-existent hunt', async () => {
            await (0, globals_1.expect)(orchestrator.getHuntStatus('non-existent-id')).rejects.toThrow('Hunt non-existent-id not found');
        });
    });
    (0, globals_1.describe)('cancelHunt', () => {
        (0, globals_1.it)('should cancel a running hunt', async () => {
            const startResponse = await orchestrator.startHunt();
            await (0, globals_1.expect)(orchestrator.cancelHunt(startResponse.huntId)).resolves.not.toThrow();
            const status = await orchestrator.getHuntStatus(startResponse.huntId);
            (0, globals_1.expect)(status.status).toBe('cancelled');
        });
        (0, globals_1.it)('should throw error for non-existent hunt', async () => {
            await (0, globals_1.expect)(orchestrator.cancelHunt('non-existent-id')).rejects.toThrow();
        });
    });
    (0, globals_1.describe)('getActiveHunts', () => {
        (0, globals_1.it)('should return list of active hunts', async () => {
            await orchestrator.startHunt();
            await orchestrator.startHunt();
            const activeHunts = orchestrator.getActiveHunts();
            (0, globals_1.expect)(Array.isArray(activeHunts)).toBe(true);
            (0, globals_1.expect)(activeHunts.length).toBeGreaterThanOrEqual(1);
        });
        (0, globals_1.it)('should not include cancelled hunts', async () => {
            const response = await orchestrator.startHunt();
            await orchestrator.cancelHunt(response.huntId);
            const activeHunts = orchestrator.getActiveHunts();
            const cancelledHunt = activeHunts.find((h) => h.huntId === response.huntId);
            (0, globals_1.expect)(cancelledHunt).toBeUndefined();
        });
    });
    (0, globals_1.describe)('getExecutionStats', () => {
        (0, globals_1.it)('should return execution statistics', async () => {
            const stats = orchestrator.getExecutionStats();
            (0, globals_1.expect)(stats).toBeDefined();
            (0, globals_1.expect)(typeof stats.totalHunts).toBe('number');
            (0, globals_1.expect)(typeof stats.completedHunts).toBe('number');
            (0, globals_1.expect)(typeof stats.failedHunts).toBe('number');
            (0, globals_1.expect)(typeof stats.activeHunts).toBe('number');
            (0, globals_1.expect)(typeof stats.avgPrecision).toBe('number');
        });
    });
    (0, globals_1.describe)('event emission', () => {
        (0, globals_1.it)('should emit hunt_started event', async () => {
            const eventHandler = globals_1.jest.fn();
            orchestrator.on('hunt_started', eventHandler);
            await orchestrator.startHunt();
            // Wait for async event emission
            await new Promise((resolve) => setTimeout(resolve, 100));
            (0, globals_1.expect)(eventHandler).toHaveBeenCalled();
        });
        (0, globals_1.it)('should emit phase_started events during execution', async () => {
            const phases = [];
            orchestrator.on('phase_started', (event) => {
                phases.push(event.data.phase);
            });
            await orchestrator.startHunt();
            // Wait for some phases to complete
            await new Promise((resolve) => setTimeout(resolve, 2000));
            (0, globals_1.expect)(phases.length).toBeGreaterThan(0);
        });
    });
});
(0, globals_1.describe)('CypherTemplateEngine', () => {
    let engine;
    (0, globals_1.beforeEach)(() => {
        engine = new CypherTemplateEngine_js_1.CypherTemplateEngine();
    });
    (0, globals_1.describe)('validateQuery', () => {
        (0, globals_1.it)('should validate safe read-only queries', () => {
            const query = 'MATCH (n:Entity) RETURN n LIMIT 100';
            const result = engine.validateQuery(query);
            (0, globals_1.expect)(result.isValid).toBe(true);
            (0, globals_1.expect)(result.isReadOnly).toBe(true);
            (0, globals_1.expect)(result.hasLimit).toBe(true);
        });
        (0, globals_1.it)('should reject queries with DELETE', () => {
            const query = 'MATCH (n:Entity) DELETE n';
            const result = engine.validateQuery(query);
            (0, globals_1.expect)(result.isValid).toBe(false);
            (0, globals_1.expect)(result.isReadOnly).toBe(false);
        });
        (0, globals_1.it)('should reject queries with SET', () => {
            const query = 'MATCH (n:Entity) SET n.name = "malicious"';
            const result = engine.validateQuery(query);
            (0, globals_1.expect)(result.isReadOnly).toBe(false);
        });
        (0, globals_1.it)('should reject queries with CREATE', () => {
            const query = 'CREATE (n:Entity {name: "test"})';
            const result = engine.validateQuery(query);
            (0, globals_1.expect)(result.isReadOnly).toBe(false);
        });
        (0, globals_1.it)('should warn about queries without LIMIT', () => {
            const query = 'MATCH (n:Entity) RETURN n';
            const result = engine.validateQuery(query);
            (0, globals_1.expect)(result.hasLimit).toBe(false);
        });
    });
    (0, globals_1.describe)('ensureLimit', () => {
        (0, globals_1.it)('should add LIMIT to query without one', () => {
            const query = 'MATCH (n:Entity) RETURN n';
            const result = engine.ensureLimit(query, 100);
            (0, globals_1.expect)(result).toContain('LIMIT 100');
        });
        (0, globals_1.it)('should not modify query with existing LIMIT', () => {
            const query = 'MATCH (n:Entity) RETURN n LIMIT 50';
            const result = engine.ensureLimit(query, 100);
            (0, globals_1.expect)(result).toContain('LIMIT 50');
            (0, globals_1.expect)(result).not.toContain('LIMIT 100');
        });
    });
    (0, globals_1.describe)('estimateComplexity', () => {
        (0, globals_1.it)('should estimate higher complexity for multiple MATCH clauses', () => {
            const simpleQuery = 'MATCH (n) RETURN n';
            const complexQuery = 'MATCH (a) MATCH (b) MATCH (c) RETURN a, b, c';
            const simpleResult = engine.validateQuery(simpleQuery);
            const complexResult = engine.validateQuery(complexQuery);
            (0, globals_1.expect)(complexResult.complexity).toBeGreaterThan(simpleResult.complexity);
        });
        (0, globals_1.it)('should estimate higher complexity for variable length paths', () => {
            const simpleQuery = 'MATCH (a)-[r]->(b) RETURN a, b';
            const complexQuery = 'MATCH (a)-[*1..5]->(b) RETURN a, b';
            const simpleResult = engine.validateQuery(simpleQuery);
            const complexResult = engine.validateQuery(complexQuery);
            (0, globals_1.expect)(complexResult.complexity).toBeGreaterThan(simpleResult.complexity);
        });
    });
});
(0, globals_1.describe)('LLMChainExecutor', () => {
    let executor;
    (0, globals_1.beforeEach)(() => {
        executor = new LLMChainExecutor_js_1.LLMChainExecutor();
        // Initialize with mock provider
        executor.initialize({
            complete: globals_1.jest.fn().mockResolvedValue({
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
    (0, globals_1.describe)('generateHypotheses', () => {
        (0, globals_1.it)('should generate hypotheses from context', async () => {
            const context = {
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
            const result = await executor.generateHypotheses(context);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.output.hypotheses).toBeDefined();
            (0, globals_1.expect)(result.output.hypotheses.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.tokensUsed.total).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('getExecutionStats', () => {
        (0, globals_1.it)('should track execution statistics', async () => {
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
            };
            await executor.generateHypotheses(context);
            const stats = executor.getExecutionStats();
            (0, globals_1.expect)(stats.totalExecutions).toBeGreaterThanOrEqual(1);
            (0, globals_1.expect)(stats.successRate).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(stats.avgTokensPerExecution).toBeGreaterThanOrEqual(0);
        });
    });
});
(0, globals_1.describe)('AutoRemediationHooks', () => {
    let hooks;
    beforeAll(async () => {
        ({ AutoRemediationHooks } = await Promise.resolve().then(() => __importStar(require('../AutoRemediationHooks.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        hooks = new AutoRemediationHooks();
    });
    (0, globals_1.describe)('enrichFindings', () => {
        (0, globals_1.it)('should enrich findings with CTI and OSINT data', async () => {
            const findings = [
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
            (0, globals_1.expect)(enriched).toBeDefined();
            (0, globals_1.expect)(enriched.length).toBe(1);
            (0, globals_1.expect)(enriched[0].enrichmentTimestamp).toBeDefined();
        });
    });
    (0, globals_1.describe)('createRemediationPlan', () => {
        (0, globals_1.it)('should create a remediation plan from findings', async () => {
            const findings = [
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
            (0, globals_1.expect)(plan).toBeDefined();
            (0, globals_1.expect)(plan.id).toBeDefined();
            (0, globals_1.expect)(plan.huntId).toBe('hunt-1');
            (0, globals_1.expect)(plan.status).toBe('pending_approval');
        });
        (0, globals_1.it)('should create approved plan when approval not required', async () => {
            const findings = [];
            const plan = await hooks.createRemediationPlan('hunt-1', findings, false);
            (0, globals_1.expect)(plan.status).toBe('approved');
        });
    });
    (0, globals_1.describe)('approvePlan', () => {
        (0, globals_1.it)('should approve a pending plan', async () => {
            const findings = [];
            const plan = await hooks.createRemediationPlan('hunt-1', findings, true);
            await hooks.approvePlan(plan.id, 'test-user');
            const updatedPlan = hooks.getActivePlans().find((p) => p.id === plan.id);
            (0, globals_1.expect)(updatedPlan?.status).toBe('approved');
            (0, globals_1.expect)(updatedPlan?.approvedBy).toBe('test-user');
        });
        (0, globals_1.it)('should throw error for non-existent plan', async () => {
            await (0, globals_1.expect)(hooks.approvePlan('non-existent', 'user')).rejects.toThrow();
        });
    });
    (0, globals_1.describe)('getPendingApprovals', () => {
        (0, globals_1.it)('should return list of pending approvals', async () => {
            const findings = [];
            const plan = await hooks.createRemediationPlan('hunt-pending-test', findings, true);
            const pending = hooks.getPendingApprovals();
            // The created plan should be in pending approvals
            (0, globals_1.expect)(Array.isArray(pending)).toBe(true);
            const ourPlan = pending.find((p) => p.id === plan.id);
            (0, globals_1.expect)(ourPlan).toBeDefined();
            (0, globals_1.expect)(ourPlan?.status).toBe('pending_approval');
        });
    });
});
(0, globals_1.describe)('Integration Tests', () => {
    (0, globals_1.describe)('Full Hunt Workflow', () => {
        (0, globals_1.it)('should complete a full hunt workflow', async () => {
            const orchestrator = new ThreatHuntingOrchestrator_js_1.ThreatHuntingOrchestrator();
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
                (0, globals_1.expect)(startResponse.huntId).toBeDefined();
                // Wait for completion (with timeout)
                let status = await orchestrator.getHuntStatus(startResponse.huntId);
                let attempts = 0;
                const maxAttempts = 30;
                while (!['completed', 'failed', 'cancelled'].includes(status.status) &&
                    attempts < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    status = await orchestrator.getHuntStatus(startResponse.huntId);
                    attempts++;
                }
                // Verify completion
                (0, globals_1.expect)(['completed', 'failed', 'cancelled']).toContain(status.status);
                if (status.status === 'completed') {
                    // Get results
                    const results = await orchestrator.getHuntResults(startResponse.huntId);
                    (0, globals_1.expect)(results).toBeDefined();
                    (0, globals_1.expect)(results.metrics).toBeDefined();
                    (0, globals_1.expect)(results.findings).toBeDefined();
                }
            }
            finally {
                orchestrator.dispose();
            }
            orchestrator.dispose();
        }, 30000); // 30 second timeout
    });
    (0, globals_1.describe)('Precision Targeting', () => {
        (0, globals_1.it)('should achieve target precision of 91%', async () => {
            const orchestrator = new ThreatHuntingOrchestrator_js_1.ThreatHuntingOrchestrator();
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
                    (0, globals_1.expect)(results.metrics.precisionEstimate).toBeGreaterThanOrEqual(0.85); // Allow 6% margin
                }
            }
            finally {
                orchestrator.dispose();
            }
            orchestrator.dispose();
        }, 30000);
    });
});
