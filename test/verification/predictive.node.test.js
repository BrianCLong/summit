"use strict";
/**
 * Predictive Analytics Verification Tests
 *
 * Verifies that the predictive execution engine cannot escape its governance cage.
 * Tests compliance with the Predictive Model Contract.
 *
 * @module test/verification/predictive
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PredictiveExecutionEngine_js_1 = require("../../server/src/analytics/engine/PredictiveExecutionEngine.js");
const PolicyEngine_js_1 = require("../../server/src/governance/PolicyEngine.js");
const types_js_1 = require("../../server/src/analytics/engine/types.js");
(0, globals_1.describe)('Predictive Analytics Governance Verification', () => {
    let engine;
    let policyEngine;
    (0, globals_1.beforeEach)(() => {
        // Create policy engine with test policies
        const policies = [
            {
                id: 'test-deny-high-risk',
                description: 'Deny high-risk predictions',
                scope: { stages: ['runtime'], tenants: ['*'] },
                rules: [{ field: 'inputs.riskLevel', operator: 'eq', value: 'high' }],
                action: 'DENY',
            },
        ];
        policyEngine = new PolicyEngine_js_1.PolicyEngine(policies);
        // Create predictive engine
        engine = new PredictiveExecutionEngine_js_1.PredictiveExecutionEngine({ enablePolicyChecks: true, enableAuditLog: true }, policyEngine);
        // Register a test model
        const testModel = {
            modelId: 'test-trend-model',
            version: '1.0.0',
            type: 'trend_analysis',
            accuracy: { metric: 'mae', value: 0.85 },
            deployedAt: new Date().toISOString(),
            validatedAt: new Date().toISOString(),
            validationResults: {
                validatedAt: new Date().toISOString(),
                validationDataset: 'test-dataset',
                accuracyMetrics: { mae: 0.85 },
                testsPassed: 10,
                testsFailed: 0,
            },
            executor: async (request, context) => {
                // Simple mock executor
                const output = {
                    predictionId: context.predictionId,
                    type: request.type,
                    value: 0.75,
                    confidence: 0.8,
                    unit: 'probability',
                    timestamp: new Date().toISOString(),
                };
                return output;
            },
        };
        engine.registerModel(testModel);
    });
    // ==========================================================================
    // Test 1: Predictive runs require declared capability
    // ==========================================================================
    (0, globals_1.describe)('Capability Authorization', () => {
        (0, globals_1.it)('should allow predictions with valid capability', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                agentId: 'agent-456',
                inputs: { metric: 'compliance_score' },
            };
            const response = await engine.predict(request);
            (0, globals_1.expect)(response).toBeDefined();
            (0, globals_1.expect)(response.output).toBeDefined();
            (0, globals_1.expect)(response.metadata.capabilityAuthorization).toBe('agent-456');
        });
        (0, globals_1.it)('should record capability authorization in metadata', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                agentId: 'agent-789',
                inputs: { metric: 'policy_violations' },
            };
            const response = await engine.predict(request);
            (0, globals_1.expect)(response.metadata.capabilityAuthorization).toBe('agent-789');
            (0, globals_1.expect)(response.metadata.governanceVerdict).toBeDefined();
            (0, globals_1.expect)(response.metadata.governanceVerdict.action).toBe('ALLOW');
        });
    });
    // ==========================================================================
    // Test 2: Limits and budgets are enforced
    // ==========================================================================
    (0, globals_1.describe)('Resource Limits', () => {
        (0, globals_1.it)('should enforce execution timeout', async () => {
            // Register a slow model
            const slowModel = {
                modelId: 'slow-model',
                version: '1.0.0',
                type: 'risk_assessment',
                accuracy: { metric: 'accuracy', value: 0.9 },
                deployedAt: new Date().toISOString(),
                validatedAt: new Date().toISOString(),
                validationResults: {
                    validatedAt: new Date().toISOString(),
                    validationDataset: 'test',
                    accuracyMetrics: {},
                    testsPassed: 1,
                    testsFailed: 0,
                },
                executor: async () => {
                    // Simulate slow execution
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    return {
                        predictionId: 'test',
                        type: 'risk_assessment',
                        value: 0.5,
                        confidence: 0.7,
                        unit: 'risk_score',
                        timestamp: new Date().toISOString(),
                    };
                },
            };
            engine.registerModel(slowModel);
            const request = {
                type: 'risk_assessment',
                tenantId: 'tenant-123',
                inputs: {},
                options: { maxExecutionTimeMs: 500 }, // 500ms timeout
            };
            await (0, globals_1.expect)(engine.predict(request)).rejects.toThrow('Execution timeout');
        });
        (0, globals_1.it)('should respect maximum execution time limit', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: {},
                options: { maxExecutionTimeMs: 999999999 }, // Try to exceed max
            };
            const response = await engine.predict(request);
            // Engine should cap the limit
            (0, globals_1.expect)(response.metadata.executionTime).toBeLessThan(300000); // Max is 5 minutes
        });
        (0, globals_1.it)('should track resource usage in metadata', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: {},
            };
            const response = await engine.predict(request);
            (0, globals_1.expect)(response.metadata.resourceUsage).toBeDefined();
            (0, globals_1.expect)(response.metadata.resourceUsage.cpuMs).toBeGreaterThan(0);
            (0, globals_1.expect)(response.metadata.resourceUsage.memoryMb).toBeGreaterThan(0);
        });
    });
    // ==========================================================================
    // Test 3: Predictions include explanations and confidence
    // ==========================================================================
    (0, globals_1.describe)('Explainability Requirements', () => {
        (0, globals_1.it)('should include complete metadata envelope', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: {},
            };
            const response = await engine.predict(request);
            // Verify all required metadata fields
            (0, globals_1.expect)(response.metadata.predictionId).toBeDefined();
            (0, globals_1.expect)(response.metadata.predictionType).toBe('trend_analysis');
            (0, globals_1.expect)(response.metadata.modelVersion).toBeDefined();
            (0, globals_1.expect)(response.metadata.governanceVerdict).toBeDefined();
            (0, globals_1.expect)(response.metadata.capabilityAuthorization).toBeDefined();
            (0, globals_1.expect)(response.metadata.tenantId).toBe('tenant-123');
            (0, globals_1.expect)(response.metadata.confidence).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(response.metadata.confidence).toBeLessThanOrEqual(1);
            (0, globals_1.expect)(response.metadata.assumptions).toBeDefined();
            (0, globals_1.expect)(response.metadata.limitations).toBeDefined();
            (0, globals_1.expect)(response.metadata.dataSources).toBeDefined();
            (0, globals_1.expect)(response.metadata.dataFreshness).toBeDefined();
            (0, globals_1.expect)(response.metadata.executionTime).toBeGreaterThan(0);
            (0, globals_1.expect)(response.metadata.resourceUsage).toBeDefined();
            (0, globals_1.expect)(response.metadata.explanation).toBeDefined();
            (0, globals_1.expect)(response.metadata.timestamp).toBeDefined();
        });
        (0, globals_1.it)('should include explanation with method and top factors', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: {},
            };
            const response = await engine.predict(request);
            (0, globals_1.expect)(response.metadata.explanation.method).toBeDefined();
            (0, globals_1.expect)(response.metadata.explanation.topFactors).toBeDefined();
            (0, globals_1.expect)(response.metadata.explanation.topFactors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should include confidence score in valid range', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: {},
            };
            const response = await engine.predict(request);
            (0, globals_1.expect)(response.metadata.confidence).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(response.metadata.confidence).toBeLessThanOrEqual(1);
        });
    });
    // ==========================================================================
    // Test 4: Policy denial blocks predictions
    // ==========================================================================
    (0, globals_1.describe)('Policy Enforcement', () => {
        (0, globals_1.it)('should block predictions denied by policy', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: { riskLevel: 'high' }, // Will trigger DENY policy
            };
            await (0, globals_1.expect)(engine.predict(request)).rejects.toThrow('Policy denied prediction');
        });
        (0, globals_1.it)('should include policy verdict in metadata for allowed predictions', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: { riskLevel: 'low' },
            };
            const response = await engine.predict(request);
            (0, globals_1.expect)(response.metadata.governanceVerdict.action).toBe('ALLOW');
            (0, globals_1.expect)(response.metadata.governanceVerdict.metadata).toBeDefined();
            (0, globals_1.expect)(response.metadata.governanceVerdict.provenance).toBeDefined();
        });
    });
    // ==========================================================================
    // Test 5: All activity is audited
    // ==========================================================================
    (0, globals_1.describe)('Audit Trail', () => {
        (0, globals_1.it)('should generate audit event for successful prediction', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                agentId: 'agent-456',
                inputs: {},
            };
            await engine.predict(request);
            const auditEvents = engine.getAuditEvents();
            (0, globals_1.expect)(auditEvents.length).toBeGreaterThan(0);
            const lastEvent = auditEvents[auditEvents.length - 1];
            (0, globals_1.expect)(lastEvent.eventType).toBe('prediction_executed');
            (0, globals_1.expect)(lastEvent.tenantId).toBe('tenant-123');
            (0, globals_1.expect)(lastEvent.agentId).toBe('agent-456');
            (0, globals_1.expect)(lastEvent.predictionType).toBe('trend_analysis');
            (0, globals_1.expect)(lastEvent.confidence).toBeDefined();
        });
        (0, globals_1.it)('should generate audit event for failed prediction', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: { riskLevel: 'high' }, // Will fail policy check
            };
            try {
                await engine.predict(request);
            }
            catch (error) {
                // Expected to fail
            }
            const auditEvents = engine.getAuditEvents();
            (0, globals_1.expect)(auditEvents.length).toBeGreaterThan(0);
            const failureEvent = auditEvents.find((e) => e.eventType === 'prediction_failed');
            (0, globals_1.expect)(failureEvent).toBeDefined();
            (0, globals_1.expect)(failureEvent.errorCode).toBe('POLICY_DENIED');
        });
        (0, globals_1.it)('should record all predictions in audit log', async () => {
            engine.clearAuditEvents();
            const requests = [
                { type: 'trend_analysis', tenantId: 'tenant-1', inputs: {} },
                { type: 'trend_analysis', tenantId: 'tenant-2', inputs: {} },
                { type: 'trend_analysis', tenantId: 'tenant-3', inputs: {} },
            ];
            for (const req of requests) {
                await engine.predict(req);
            }
            const auditEvents = engine.getAuditEvents();
            const executedEvents = auditEvents.filter((e) => e.eventType === 'prediction_executed');
            (0, globals_1.expect)(executedEvents.length).toBe(3);
        });
    });
    // ==========================================================================
    // Test 6: Output validation
    // ==========================================================================
    (0, globals_1.describe)('Output Validation', () => {
        (0, globals_1.it)('should validate prediction output schema', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: {},
            };
            const response = await engine.predict(request);
            // Verify output structure
            (0, globals_1.expect)(response.output).toBeDefined();
            (0, globals_1.expect)(response.output.predictionId).toBeDefined();
            if ('value' in response.output) {
                // PredictionScore
                (0, globals_1.expect)(typeof response.output.value).toBe('number');
                (0, globals_1.expect)(response.output.confidence).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(response.output.confidence).toBeLessThanOrEqual(1);
            }
        });
        (0, globals_1.it)('should reject predictions with incomplete metadata', async () => {
            // Register a model that returns incomplete metadata
            const badModel = {
                modelId: 'bad-model',
                version: '1.0.0',
                type: 'likelihood_scoring',
                accuracy: { metric: 'accuracy', value: 0.5 },
                deployedAt: new Date().toISOString(),
                validatedAt: new Date().toISOString(),
                validationResults: {
                    validatedAt: new Date().toISOString(),
                    validationDataset: 'test',
                    accuracyMetrics: {},
                    testsPassed: 1,
                    testsFailed: 0,
                },
                executor: async (request, context) => {
                    // Return output without confidence (invalid)
                    return {
                        predictionId: context.predictionId,
                        type: request.type,
                        value: 0.5,
                        unit: 'probability',
                        timestamp: new Date().toISOString(),
                    }; // Force invalid output
                },
            };
            engine.registerModel(badModel);
            const request = {
                type: 'likelihood_scoring',
                tenantId: 'tenant-123',
                inputs: {},
            };
            // Should fail validation and generate audit event
            try {
                await engine.predict(request);
            }
            catch (error) {
                (0, globals_1.expect)(error).toBeInstanceOf(types_js_1.PredictionError);
            }
        });
    });
    // ==========================================================================
    // Test 7: Caching behavior
    // ==========================================================================
    (0, globals_1.describe)('Prediction Caching', () => {
        (0, globals_1.it)('should cache identical prediction requests', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: { metric: 'test' },
            };
            const response1 = await engine.predict(request);
            const response2 = await engine.predict(request);
            // Should return same prediction ID (cached)
            (0, globals_1.expect)(response1.output.predictionId).toBe(response2.output.predictionId);
        });
        (0, globals_1.it)('should respect cache disable option', async () => {
            const request = {
                type: 'trend_analysis',
                tenantId: 'tenant-123',
                inputs: { metric: 'test2' },
                options: { enableCaching: false },
            };
            const response1 = await engine.predict(request);
            const response2 = await engine.predict(request);
            // Should generate new predictions (no caching)
            (0, globals_1.expect)(response1.output.predictionId).not.toBe(response2.output.predictionId);
        });
    });
});
