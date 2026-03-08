"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const workflows_js_1 = require("../src/v1/workflows.js");
(0, vitest_1.describe)('PersonNetworkWorkflowInputV1', () => {
    (0, vitest_1.it)('should validate valid workflow input', () => {
        const input = {
            version: 'v1',
            personId: '123e4567-e89b-12d3-a456-426614174000',
            analysisDepth: 2,
            includeAnalysis: true,
            options: {
                maxNetworkSize: 100,
                relationshipTypes: ['colleague', 'business'],
            },
        };
        const result = workflows_js_1.PersonNetworkWorkflowInputV1.safeParse(input);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.analysisDepth).toBe(2);
            (0, vitest_1.expect)(result.data.includeAnalysis).toBe(true);
        }
    });
    (0, vitest_1.it)('should apply default values', () => {
        const input = {
            version: 'v1',
            personId: '123e4567-e89b-12d3-a456-426614174000',
        };
        const result = workflows_js_1.PersonNetworkWorkflowInputV1.safeParse(input);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.analysisDepth).toBe(2); // default
            (0, vitest_1.expect)(result.data.includeAnalysis).toBe(true); // default
        }
    });
    (0, vitest_1.it)('should fail validation for depth out of range', () => {
        const input = {
            version: 'v1',
            personId: '123e4567-e89b-12d3-a456-426614174000',
            analysisDepth: 5, // Invalid: > 3
        };
        const result = workflows_js_1.PersonNetworkWorkflowInputV1.safeParse(input);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
    (0, vitest_1.it)('should fail validation for invalid person ID', () => {
        const input = {
            version: 'v1',
            personId: 'not-a-uuid',
            analysisDepth: 2,
        };
        const result = workflows_js_1.PersonNetworkWorkflowInputV1.safeParse(input);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)('PersonNetworkWorkflowOutputV1', () => {
    (0, vitest_1.it)('should validate valid workflow output', () => {
        const output = {
            version: 'v1',
            person: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                type: 'Person',
                version: 'v1',
                attributes: {
                    name: 'Alice Smith',
                    email: 'alice@example.com',
                },
                metadata: {
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                    source: 'test-source',
                    confidence: 0.95,
                },
            },
            networkSize: 25,
            summary: 'Alice Smith has a network of 25 connections, primarily colleagues and business associates.',
            associations: [],
            insights: {
                clusterCount: 3,
                strongConnections: 8,
                weakConnections: 5,
                dominantRelationshipType: 'colleague',
            },
            metadata: {
                analyzedAt: '2024-01-01T00:00:00Z',
                processingTimeMs: 1500,
            },
        };
        const result = workflows_js_1.PersonNetworkWorkflowOutputV1.safeParse(output);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.networkSize).toBe(25);
            (0, vitest_1.expect)(result.data.insights?.strongConnections).toBe(8);
        }
    });
    (0, vitest_1.it)('should validate output without optional insights', () => {
        const output = {
            version: 'v1',
            person: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                type: 'Person',
                version: 'v1',
                attributes: {
                    name: 'Alice Smith',
                },
                metadata: {
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                    source: 'test-source',
                    confidence: 1.0,
                },
            },
            networkSize: 10,
            summary: 'Small network.',
            associations: [],
            metadata: {
                analyzedAt: '2024-01-01T00:00:00Z',
                processingTimeMs: 500,
            },
        };
        const result = workflows_js_1.PersonNetworkWorkflowOutputV1.safeParse(output);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
(0, vitest_1.describe)('StartPersonNetworkWorkflowRequestV1', () => {
    (0, vitest_1.it)('should validate valid start workflow request', () => {
        const request = {
            version: 'v1',
            workflow: 'person-network-analysis',
            namespace: 'integration',
            inputs: {
                version: 'v1',
                personId: '123e4567-e89b-12d3-a456-426614174000',
                analysisDepth: 2,
                includeAnalysis: true,
            },
            metadata: {
                correlationId: '223e4567-e89b-12d3-a456-426614174000',
                initiatedBy: 'user@example.com',
                priority: 'high',
            },
        };
        const result = workflows_js_1.StartPersonNetworkWorkflowRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.workflow).toBe('person-network-analysis');
            (0, vitest_1.expect)(result.data.metadata?.priority).toBe('high');
        }
    });
    (0, vitest_1.it)('should apply default namespace', () => {
        const request = {
            version: 'v1',
            workflow: 'person-network-analysis',
            inputs: {
                version: 'v1',
                personId: '123e4567-e89b-12d3-a456-426614174000',
            },
        };
        const result = workflows_js_1.StartPersonNetworkWorkflowRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.namespace).toBe('integration'); // default
        }
    });
    (0, vitest_1.it)('should fail validation for wrong workflow name', () => {
        const request = {
            version: 'v1',
            workflow: 'wrong-workflow-name',
            inputs: {
                version: 'v1',
                personId: '123e4567-e89b-12d3-a456-426614174000',
            },
        };
        const result = workflows_js_1.StartPersonNetworkWorkflowRequestV1.safeParse(request);
        (0, vitest_1.expect)(result.success).toBe(false);
    });
});
(0, vitest_1.describe)('StartWorkflowResponseV1', () => {
    (0, vitest_1.it)('should validate valid start workflow response', () => {
        const response = {
            version: 'v1',
            runId: '123e4567-e89b-12d3-a456-426614174000',
            status: 'pending',
            startedAt: '2024-01-01T00:00:00Z',
        };
        const result = workflows_js_1.StartWorkflowResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.status).toBe('pending');
        }
    });
    (0, vitest_1.it)('should validate all workflow statuses', () => {
        const statuses = [
            'pending',
            'running',
            'completed',
            'failed',
            'cancelled',
            'timeout',
        ];
        statuses.forEach((status) => {
            const response = {
                version: 'v1',
                runId: '123e4567-e89b-12d3-a456-426614174000',
                status,
                startedAt: '2024-01-01T00:00:00Z',
            };
            const result = workflows_js_1.StartWorkflowResponseV1.safeParse(response);
            (0, vitest_1.expect)(result.success).toBe(true);
        });
    });
});
(0, vitest_1.describe)('GetWorkflowStatusResponseV1', () => {
    (0, vitest_1.it)('should validate completed workflow status', () => {
        const response = {
            version: 'v1',
            runId: '123e4567-e89b-12d3-a456-426614174000',
            workflow: 'person-network-analysis',
            namespace: 'integration',
            status: 'completed',
            startedAt: '2024-01-01T00:00:00Z',
            completedAt: '2024-01-01T00:00:05Z',
            outputs: {
                person: { id: '123', type: 'Person', version: 'v1' },
                networkSize: 25,
                summary: 'Network analysis complete',
            },
            steps: [
                {
                    id: 'step-1',
                    name: 'query-network',
                    status: 'completed',
                    startedAt: '2024-01-01T00:00:00Z',
                    completedAt: '2024-01-01T00:00:02Z',
                },
                {
                    id: 'step-2',
                    name: 'summarize',
                    status: 'completed',
                    startedAt: '2024-01-01T00:00:02Z',
                    completedAt: '2024-01-01T00:00:05Z',
                },
            ],
            metadata: {
                totalSteps: 2,
                completedSteps: 2,
                processingTimeMs: 5000,
            },
        };
        const result = workflows_js_1.GetWorkflowStatusResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.status).toBe('completed');
            (0, vitest_1.expect)(result.data.steps).toHaveLength(2);
            (0, vitest_1.expect)(result.data.metadata?.completedSteps).toBe(2);
        }
    });
    (0, vitest_1.it)('should validate failed workflow status with error', () => {
        const response = {
            version: 'v1',
            runId: '123e4567-e89b-12d3-a456-426614174000',
            workflow: 'person-network-analysis',
            namespace: 'integration',
            status: 'failed',
            startedAt: '2024-01-01T00:00:00Z',
            completedAt: '2024-01-01T00:00:03Z',
            error: 'IntelGraph query failed: person not found',
            steps: [
                {
                    id: 'step-1',
                    name: 'query-network',
                    status: 'failed',
                    startedAt: '2024-01-01T00:00:00Z',
                    completedAt: '2024-01-01T00:00:03Z',
                    error: 'Person not found',
                },
            ],
        };
        const result = workflows_js_1.GetWorkflowStatusResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, vitest_1.expect)(result.data.status).toBe('failed');
            (0, vitest_1.expect)(result.data.error).toBeDefined();
            (0, vitest_1.expect)(result.data.steps?.[0].status).toBe('failed');
        }
    });
    (0, vitest_1.it)('should validate running workflow without outputs', () => {
        const response = {
            version: 'v1',
            runId: '123e4567-e89b-12d3-a456-426614174000',
            workflow: 'person-network-analysis',
            namespace: 'integration',
            status: 'running',
            startedAt: '2024-01-01T00:00:00Z',
            steps: [
                {
                    id: 'step-1',
                    name: 'query-network',
                    status: 'running',
                    startedAt: '2024-01-01T00:00:00Z',
                },
            ],
        };
        const result = workflows_js_1.GetWorkflowStatusResponseV1.safeParse(response);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
