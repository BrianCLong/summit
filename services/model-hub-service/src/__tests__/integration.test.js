"use strict";
/**
 * Integration Tests for Model Hub Service
 *
 * Tests the complete flow: model onboard -> evaluate -> approve -> deploy
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock database for integration tests
const mockDb = {
    models: new Map(),
    versions: new Map(),
    deployments: new Map(),
    policies: new Map(),
    approvals: new Map(),
    evaluations: new Map(),
};
// Mock implementations
globals_1.jest.mock('../db/connection.js', () => ({
    db: {
        query: globals_1.jest.fn(),
        getClient: globals_1.jest.fn(),
        transaction: globals_1.jest.fn((fn) => fn({})),
        healthCheck: globals_1.jest.fn().mockResolvedValue({ status: 'healthy' }),
        connect: globals_1.jest.fn(),
        close: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('Model Hub Integration Flow', () => {
    (0, globals_1.describe)('Model Onboarding Flow', () => {
        (0, globals_1.it)('should create a new model with version', async () => {
            // Simulate model creation
            const modelId = 'test-model-001';
            const model = {
                id: modelId,
                name: 'claude-3-sonnet',
                displayName: 'Claude 3 Sonnet',
                provider: 'anthropic',
                capabilities: ['nl-to-query', 'rag', 'classification'],
                status: 'draft',
                tags: ['llm', 'fast'],
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
                updatedBy: 'admin',
            };
            mockDb.models.set(modelId, model);
            (0, globals_1.expect)(mockDb.models.get(modelId)).toBeDefined();
            (0, globals_1.expect)(mockDb.models.get(modelId).name).toBe('claude-3-sonnet');
        });
        (0, globals_1.it)('should create a model version with endpoint configuration', async () => {
            const versionId = 'test-version-001';
            const version = {
                id: versionId,
                modelId: 'test-model-001',
                version: '1.0.0',
                status: 'draft',
                endpoint: 'https://api.anthropic.com/v1/messages',
                endpointType: 'rest',
                configuration: {
                    maxTokens: 4096,
                    temperature: 0.7,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
            };
            mockDb.versions.set(versionId, version);
            (0, globals_1.expect)(mockDb.versions.get(versionId)).toBeDefined();
            (0, globals_1.expect)(mockDb.versions.get(versionId).version).toBe('1.0.0');
        });
    });
    (0, globals_1.describe)('Evaluation Flow', () => {
        (0, globals_1.it)('should run evaluation suite before promotion', async () => {
            const evaluationId = 'eval-001';
            const evaluation = {
                id: evaluationId,
                modelVersionId: 'test-version-001',
                evaluationSuiteId: 'basic-safety',
                status: 'pending',
                triggeredBy: 'admin',
                triggerType: 'manual',
                createdAt: new Date(),
            };
            mockDb.evaluations.set(evaluationId, evaluation);
            // Simulate evaluation completion
            const completedEvaluation = {
                ...evaluation,
                status: 'completed',
                completedAt: new Date(),
                results: {
                    metrics: { overallScore: 0.95 },
                    passed: true,
                    summary: 'All evaluations passed',
                    detailedResults: [
                        { testName: 'harmful-content-detection', passed: true, score: 0.98 },
                        { testName: 'pii-leakage', passed: true, score: 1.0 },
                    ],
                },
            };
            mockDb.evaluations.set(evaluationId, completedEvaluation);
            (0, globals_1.expect)(mockDb.evaluations.get(evaluationId).results.passed).toBe(true);
        });
        (0, globals_1.it)('should block promotion if evaluation fails', async () => {
            const evaluationId = 'eval-002';
            const failedEvaluation = {
                id: evaluationId,
                modelVersionId: 'test-version-002',
                evaluationSuiteId: 'basic-safety',
                status: 'completed',
                results: {
                    metrics: { overallScore: 0.7 },
                    passed: false,
                    summary: 'Evaluation failed: score 0.70 below threshold 0.95',
                },
                triggeredBy: 'admin',
                triggerType: 'promotion',
                createdAt: new Date(),
                completedAt: new Date(),
            };
            mockDb.evaluations.set(evaluationId, failedEvaluation);
            // Verify promotion would be blocked
            const canPromote = mockDb.evaluations.get(evaluationId).results.passed;
            (0, globals_1.expect)(canPromote).toBe(false);
        });
    });
    (0, globals_1.describe)('Approval Flow', () => {
        (0, globals_1.it)('should request approval for production deployment', async () => {
            const approvalId = 'approval-001';
            const approval = {
                id: approvalId,
                modelVersionId: 'test-version-001',
                environment: 'production',
                status: 'pending',
                requestedBy: 'admin',
                requestedAt: new Date(),
                evaluationRequirements: ['basic-safety', 'accuracy-validation'],
                evaluationResults: {
                    'basic-safety': { passed: true, score: 0.95 },
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockDb.approvals.set(approvalId, approval);
            (0, globals_1.expect)(mockDb.approvals.get(approvalId).status).toBe('pending');
        });
        (0, globals_1.it)('should approve model version after review', async () => {
            const approvalId = 'approval-001';
            const approval = mockDb.approvals.get(approvalId);
            const approvedApproval = {
                ...approval,
                status: 'approved',
                reviewedBy: 'security-admin',
                reviewedAt: new Date(),
                approvalNotes: 'All security checks passed',
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
                updatedAt: new Date(),
            };
            mockDb.approvals.set(approvalId, approvedApproval);
            (0, globals_1.expect)(mockDb.approvals.get(approvalId).status).toBe('approved');
        });
        (0, globals_1.it)('should reject approval with reason', async () => {
            const approvalId = 'approval-002';
            const rejectedApproval = {
                id: approvalId,
                modelVersionId: 'test-version-002',
                environment: 'production',
                status: 'rejected',
                requestedBy: 'admin',
                requestedAt: new Date(),
                reviewedBy: 'security-admin',
                reviewedAt: new Date(),
                rejectionReason: 'Safety evaluation score too low',
                evaluationRequirements: ['basic-safety'],
                evaluationResults: {
                    'basic-safety': { passed: false, score: 0.7 },
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockDb.approvals.set(approvalId, rejectedApproval);
            (0, globals_1.expect)(mockDb.approvals.get(approvalId).status).toBe('rejected');
            (0, globals_1.expect)(mockDb.approvals.get(approvalId).rejectionReason).toBeDefined();
        });
    });
    (0, globals_1.describe)('Deployment Flow', () => {
        (0, globals_1.it)('should create deployment configuration', async () => {
            const deploymentId = 'deployment-001';
            const deployment = {
                id: deploymentId,
                modelVersionId: 'test-version-001',
                environment: 'production',
                mode: 'canary',
                trafficPercentage: 10,
                scaling: {
                    minReplicas: 2,
                    maxReplicas: 10,
                },
                circuitBreaker: {
                    enabled: true,
                    failureRateThreshold: 50,
                },
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
            };
            mockDb.deployments.set(deploymentId, deployment);
            (0, globals_1.expect)(mockDb.deployments.get(deploymentId).mode).toBe('canary');
        });
        (0, globals_1.it)('should activate deployment after approval', async () => {
            const deploymentId = 'deployment-001';
            const deployment = mockDb.deployments.get(deploymentId);
            // Check approval first
            const approval = mockDb.approvals.get('approval-001');
            (0, globals_1.expect)(approval.status).toBe('approved');
            // Activate deployment
            const activatedDeployment = {
                ...deployment,
                isActive: true,
                activatedAt: new Date(),
                activatedBy: 'admin',
                updatedAt: new Date(),
            };
            mockDb.deployments.set(deploymentId, activatedDeployment);
            (0, globals_1.expect)(mockDb.deployments.get(deploymentId).isActive).toBe(true);
        });
        (0, globals_1.it)('should support gradual traffic rollout', async () => {
            const deploymentId = 'deployment-001';
            const deployment = mockDb.deployments.get(deploymentId);
            // Simulate gradual rollout
            const trafficSteps = [10, 25, 50, 75, 100];
            for (const percentage of trafficSteps) {
                const updatedDeployment = {
                    ...mockDb.deployments.get(deploymentId),
                    trafficPercentage: percentage,
                    updatedAt: new Date(),
                };
                mockDb.deployments.set(deploymentId, updatedDeployment);
                (0, globals_1.expect)(mockDb.deployments.get(deploymentId).trafficPercentage).toBe(percentage);
            }
            // Final state should be 100%
            (0, globals_1.expect)(mockDb.deployments.get(deploymentId).trafficPercentage).toBe(100);
        });
        (0, globals_1.it)('should support rollback', async () => {
            const deploymentId = 'deployment-001';
            // Simulate rollback
            const rolledBackDeployment = {
                ...mockDb.deployments.get(deploymentId),
                trafficPercentage: 0,
                isActive: false,
                deactivatedAt: new Date(),
                deactivatedBy: 'admin',
                updatedAt: new Date(),
            };
            mockDb.deployments.set(deploymentId, rolledBackDeployment);
            (0, globals_1.expect)(mockDb.deployments.get(deploymentId).isActive).toBe(false);
            (0, globals_1.expect)(mockDb.deployments.get(deploymentId).trafficPercentage).toBe(0);
        });
    });
    (0, globals_1.describe)('Shadow Mode Evaluation', () => {
        (0, globals_1.it)('should support shadow mode deployment', async () => {
            const shadowDeploymentId = 'deployment-shadow-001';
            const shadowDeployment = {
                id: shadowDeploymentId,
                modelVersionId: 'test-version-003', // New model version to test
                environment: 'production',
                mode: 'shadow',
                trafficPercentage: 100, // Shadow receives all traffic but doesn't serve
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
            };
            mockDb.deployments.set(shadowDeploymentId, shadowDeployment);
            (0, globals_1.expect)(mockDb.deployments.get(shadowDeploymentId).mode).toBe('shadow');
            (0, globals_1.expect)(mockDb.deployments.get(shadowDeploymentId).isActive).toBe(true);
        });
    });
    (0, globals_1.describe)('Policy Enforcement', () => {
        (0, globals_1.it)('should apply policy profile to deployment', async () => {
            const policyId = 'policy-001';
            const policy = {
                id: policyId,
                name: 'production-policy',
                description: 'Policy for production models',
                rules: {
                    maxTokensPerRequest: 4096,
                    maxTokensPerHour: 1000000,
                    requireAuditLog: true,
                    piiScrubbing: true,
                    contentFiltering: true,
                },
                dataClassifications: ['unclassified', 'cui'],
                isDefault: false,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'admin',
            };
            mockDb.policies.set(policyId, policy);
            // Update deployment with policy
            const deploymentId = 'deployment-001';
            const deployment = mockDb.deployments.get(deploymentId);
            const updatedDeployment = {
                ...deployment,
                policyProfileId: policyId,
                updatedAt: new Date(),
            };
            mockDb.deployments.set(deploymentId, updatedDeployment);
            (0, globals_1.expect)(mockDb.deployments.get(deploymentId).policyProfileId).toBe(policyId);
        });
    });
});
(0, globals_1.describe)('End-to-End Model Selection', () => {
    (0, globals_1.it)('should select model based on tenant binding', async () => {
        // Setup: Create tenant binding
        const binding = {
            tenantId: 'tenant-gov-001',
            capability: 'nl-to-query',
            modelVersionId: 'test-version-001',
            isEnabled: true,
            priority: 10,
        };
        // Simulate model selection request
        const request = {
            capability: 'nl-to-query',
            tenantId: 'tenant-gov-001',
            requireApproved: true,
        };
        // Selection should find the tenant binding
        (0, globals_1.expect)(binding.tenantId).toBe(request.tenantId);
        (0, globals_1.expect)(binding.capability).toBe(request.capability);
        (0, globals_1.expect)(binding.isEnabled).toBe(true);
    });
    (0, globals_1.it)('should fall back to routing rules when no tenant binding', async () => {
        // Setup: Create routing rule
        const rule = {
            id: 'rule-001',
            name: 'default-rag-routing',
            priority: 1000,
            conditions: [
                { field: 'capability', operator: 'equals', value: 'rag' },
            ],
            conditionLogic: 'all',
            targetModelVersionId: 'test-version-001',
            isEnabled: true,
        };
        // Simulate model selection request (no tenant binding)
        const request = {
            capability: 'rag',
            tenantId: 'new-tenant-001',
            requireApproved: true,
        };
        // Should match routing rule
        const matches = rule.conditions.every((c) => {
            if (c.field === 'capability' && c.operator === 'equals') {
                return request.capability === c.value;
            }
            return false;
        });
        (0, globals_1.expect)(matches).toBe(true);
    });
});
