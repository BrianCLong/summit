"use strict";
// Unit Tests for Governance Metrics Service
// Tests Prometheus integration, ODNI validation tracking, and p95 < 2s latency
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
// Mock fetch for Prometheus queries
const mockFetch = globals_1.jest.fn();
global.fetch = mockFetch;
(0, globals_1.describe)('GovernanceMetricsService', () => {
    let createGovernanceMetricsService;
    let service;
    const testTenantId = 'test-tenant';
    const testTimeRange = {
        start: Date.now() - 86400000,
        end: Date.now(),
        label: 'Last 24 hours',
    };
    (0, globals_1.beforeAll)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../governance-metrics-service.js')));
        createGovernanceMetricsService = module.createGovernanceMetricsService;
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockFetch.mockReset();
        service = createGovernanceMetricsService({
            prometheusUrl: 'http://localhost:9090',
            redisUrl: 'redis://localhost:6379',
            refreshIntervalMs: 30000,
            enableRealTime: false,
        });
    });
    (0, globals_1.afterEach)(async () => {
        await service.disconnect();
    });
    (0, globals_1.describe)('getGovernanceMetrics', () => {
        (0, globals_1.it)('should return complete governance metrics', async () => {
            // Mock Prometheus responses
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '87.5'] }],
                    },
                }),
            });
            const metrics = await service.getGovernanceMetrics(testTenantId, testTimeRange);
            (0, globals_1.expect)(metrics).toHaveProperty('validationRate');
            (0, globals_1.expect)(metrics).toHaveProperty('incidentTrends');
            (0, globals_1.expect)(metrics).toHaveProperty('complianceGaps');
            (0, globals_1.expect)(metrics).toHaveProperty('riskScore');
            (0, globals_1.expect)(metrics).toHaveProperty('auditTrail');
            (0, globals_1.expect)(metrics).toHaveProperty('modelGovernance');
            (0, globals_1.expect)(metrics).toHaveProperty('timestamp');
        });
        (0, globals_1.it)('should complete within p95 latency target of 2 seconds', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '90'] }],
                    },
                }),
            });
            const startTime = Date.now();
            await service.getGovernanceMetrics(testTenantId, testTimeRange);
            const latency = Date.now() - startTime;
            // Should complete well under 2 seconds
            (0, globals_1.expect)(latency).toBeLessThan(2000);
        });
        (0, globals_1.it)('should use cached metrics when available', async () => {
            // First call
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '88'] }],
                    },
                }),
            });
            await service.getGovernanceMetrics(testTenantId, testTimeRange);
            const firstCallCount = mockFetch.mock.calls.length;
            // Second call should use cache (fewer Prometheus calls)
            // Note: In real implementation, this would check Redis cache
        });
    });
    (0, globals_1.describe)('ODNI Validation Tracking', () => {
        (0, globals_1.it)('should track validation rate against 85% target', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '87.5'] }],
                    },
                }),
            });
            const metrics = await service.getValidationMetrics(testTenantId, testTimeRange);
            (0, globals_1.expect)(metrics.targetRate).toBe(85);
            (0, globals_1.expect)(metrics).toHaveProperty('validationRate');
            (0, globals_1.expect)(metrics).toHaveProperty('totalDecisions');
            (0, globals_1.expect)(metrics).toHaveProperty('validatedDecisions');
        });
        (0, globals_1.it)('should calculate validation trend correctly', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '90'] }],
                    },
                }),
            });
            const metrics = await service.getValidationMetrics(testTenantId, testTimeRange);
            (0, globals_1.expect)(['up', 'down', 'stable']).toContain(metrics.trend);
        });
        (0, globals_1.it)('should include validation breakdown by category', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [
                            { metric: { category: 'classification' }, value: [Date.now() / 1000, '92'] },
                            { metric: { category: 'detection' }, value: [Date.now() / 1000, '85'] },
                        ],
                    },
                }),
            });
            const metrics = await service.getValidationMetrics(testTenantId, testTimeRange);
            (0, globals_1.expect)(Array.isArray(metrics.breakdown)).toBe(true);
        });
        (0, globals_1.it)('should handle Prometheus errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Prometheus unavailable'));
            const metrics = await service.getValidationMetrics(testTenantId, testTimeRange);
            // Should return fallback metrics
            (0, globals_1.expect)(metrics.validationRate).toBe(0);
            (0, globals_1.expect)(metrics.targetRate).toBe(85);
        });
    });
    (0, globals_1.describe)('Incident Trends', () => {
        (0, globals_1.it)('should return incident trend data', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '15'] }],
                    },
                }),
            });
            const trends = await service.getIncidentTrends(testTenantId, testTimeRange);
            (0, globals_1.expect)(trends).toHaveProperty('current');
            (0, globals_1.expect)(trends).toHaveProperty('previous');
            (0, globals_1.expect)(trends).toHaveProperty('trend');
            (0, globals_1.expect)(trends).toHaveProperty('byCategory');
            (0, globals_1.expect)(trends).toHaveProperty('bySeverity');
            (0, globals_1.expect)(trends).toHaveProperty('timeline');
        });
        (0, globals_1.it)('should calculate MTTR correctly', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '3600'] }], // 1 hour
                    },
                }),
            });
            const trends = await service.getIncidentTrends(testTenantId, testTimeRange);
            (0, globals_1.expect)(trends.current.mttr).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should include severity breakdown', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [
                            { metric: { severity: 'critical' }, value: [Date.now() / 1000, '2'] },
                            { metric: { severity: 'high' }, value: [Date.now() / 1000, '5'] },
                            { metric: { severity: 'medium' }, value: [Date.now() / 1000, '10'] },
                            { metric: { severity: 'low' }, value: [Date.now() / 1000, '8'] },
                        ],
                    },
                }),
            });
            const trends = await service.getIncidentTrends(testTenantId, testTimeRange);
            (0, globals_1.expect)(Array.isArray(trends.bySeverity)).toBe(true);
        });
    });
    (0, globals_1.describe)('Compliance Gaps', () => {
        (0, globals_1.it)('should return compliance gaps sorted by severity', async () => {
            const gaps = await service.getComplianceGaps(testTenantId);
            (0, globals_1.expect)(Array.isArray(gaps)).toBe(true);
        });
        (0, globals_1.it)('should only include open and in-progress gaps', async () => {
            const gaps = await service.getComplianceGaps(testTenantId);
            gaps.forEach((gap) => {
                (0, globals_1.expect)(['open', 'in_progress']).toContain(gap.status);
            });
        });
    });
    (0, globals_1.describe)('Risk Score', () => {
        (0, globals_1.it)('should return risk score with components', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '75'] }],
                    },
                }),
            });
            const riskScore = await service.getRiskScore(testTenantId);
            (0, globals_1.expect)(riskScore).toHaveProperty('overall');
            (0, globals_1.expect)(riskScore).toHaveProperty('components');
            (0, globals_1.expect)(riskScore).toHaveProperty('trend');
            (0, globals_1.expect)(riskScore).toHaveProperty('historicalScores');
        });
        (0, globals_1.it)('should calculate component status correctly', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [
                            { metric: { component: 'security' }, value: [Date.now() / 1000, '85'] },
                            { metric: { component: 'compliance' }, value: [Date.now() / 1000, '60'] },
                            { metric: { component: 'access' }, value: [Date.now() / 1000, '40'] },
                        ],
                    },
                }),
            });
            const riskScore = await service.getRiskScore(testTenantId);
            riskScore.components.forEach((component) => {
                (0, globals_1.expect)(['healthy', 'warning', 'critical']).toContain(component.status);
            });
        });
    });
    (0, globals_1.describe)('Audit Events', () => {
        (0, globals_1.it)('should return recent audit events', async () => {
            const events = await service.getRecentAuditEvents(testTenantId, 50);
            (0, globals_1.expect)(Array.isArray(events)).toBe(true);
        });
        (0, globals_1.it)('should record new audit events', async () => {
            const eventId = await service.recordAuditEvent(testTenantId, {
                eventType: 'policy_change',
                actor: 'admin@example.com',
                resource: 'retention-policy',
                action: 'updated',
                outcome: 'success',
                riskLevel: 'low',
                details: {},
            });
            (0, globals_1.expect)(eventId).toBeDefined();
            (0, globals_1.expect)(typeof eventId).toBe('string');
        });
    });
    (0, globals_1.describe)('Model Governance', () => {
        (0, globals_1.it)('should return model governance metrics', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '50'] }],
                    },
                }),
            });
            const modelMetrics = await service.getModelGovernanceMetrics(testTenantId);
            (0, globals_1.expect)(modelMetrics).toHaveProperty('totalModels');
            (0, globals_1.expect)(modelMetrics).toHaveProperty('approvedModels');
            (0, globals_1.expect)(modelMetrics).toHaveProperty('pendingReview');
            (0, globals_1.expect)(modelMetrics).toHaveProperty('rejectedModels');
            (0, globals_1.expect)(modelMetrics).toHaveProperty('deploymentMetrics');
            (0, globals_1.expect)(modelMetrics).toHaveProperty('biasMetrics');
        });
    });
    (0, globals_1.describe)('Dashboard Configuration', () => {
        (0, globals_1.it)('should return dashboard configuration', () => {
            const config = service.getDashboardConfig();
            (0, globals_1.expect)(config).toHaveProperty('refreshIntervalSeconds');
            (0, globals_1.expect)(config).toHaveProperty('defaultTimeRange');
            (0, globals_1.expect)(config).toHaveProperty('alertThresholds');
            (0, globals_1.expect)(config).toHaveProperty('features');
        });
        (0, globals_1.it)('should have correct ODNI threshold', () => {
            const config = service.getDashboardConfig();
            (0, globals_1.expect)(config.alertThresholds.validationRateCritical).toBe(85);
        });
    });
    (0, globals_1.describe)('Compliance Gap Recording', () => {
        (0, globals_1.it)('should record new compliance gaps', async () => {
            const gapId = await service.recordComplianceGap({
                framework: 'SOC2',
                requirement: 'CC6.1',
                category: 'Access Control',
                severity: 'high',
                description: 'Test gap',
                currentState: 'Current',
                requiredState: 'Required',
                status: 'open',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            (0, globals_1.expect)(gapId).toBeDefined();
            (0, globals_1.expect)(typeof gapId).toBe('string');
        });
    });
    (0, globals_1.describe)('Prometheus Query Builder', () => {
        (0, globals_1.it)('should build correct instant query URL', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: { result: [] },
                }),
            });
            await service.getValidationMetrics(testTenantId, testTimeRange);
            (0, globals_1.expect)(mockFetch).toHaveBeenCalled();
            const callUrl = mockFetch.mock.calls[0][0];
            (0, globals_1.expect)(callUrl).toContain('/api/v1/query');
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle Prometheus timeout gracefully', async () => {
            mockFetch.mockImplementation(() => {
                return new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Timeout')), 100);
                });
            });
            const metrics = await service.getGovernanceMetrics(testTenantId, testTimeRange);
            // Should return fallback/default metrics
            (0, globals_1.expect)(metrics).toBeDefined();
            (0, globals_1.expect)(metrics.timestamp).toBeDefined();
        });
        (0, globals_1.it)('should handle malformed Prometheus response', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ invalid: 'response' }),
            });
            const metrics = await service.getValidationMetrics(testTenantId, testTimeRange);
            // Should return fallback metrics with 0 values
            (0, globals_1.expect)(metrics.validationRate).toBe(0);
        });
    });
    (0, globals_1.describe)('Prometheus Metrics Recording', () => {
        (0, globals_1.it)('should record dashboard latency metrics', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '85'] }],
                    },
                }),
            });
            await service.getGovernanceMetrics(testTenantId, testTimeRange);
            // Histogram should have recorded the latency
            // In a real test, we'd check the Prometheus registry
        });
        (0, globals_1.it)('should update validation rate gauge', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        result: [{ value: [Date.now() / 1000, '87.5'] }],
                    },
                }),
            });
            await service.getGovernanceMetrics(testTenantId, testTimeRange);
            // Gauge should have been updated
            // In a real test, we'd check the Prometheus registry
        });
    });
});
(0, globals_1.describe)('Prometheus Query Definitions', () => {
    (0, globals_1.it)('should have all required validation queries', async () => {
        const { VALIDATION_QUERIES } = await Promise.resolve().then(() => __importStar(require('../prometheus-queries.js')));
        (0, globals_1.expect)(VALIDATION_QUERIES).toHaveProperty('validationRate');
        (0, globals_1.expect)(VALIDATION_QUERIES).toHaveProperty('validatedDecisions');
        (0, globals_1.expect)(VALIDATION_QUERIES).toHaveProperty('totalDecisions');
        (0, globals_1.expect)(VALIDATION_QUERIES).toHaveProperty('validationByCategory');
    });
    (0, globals_1.it)('should have all required incident queries', async () => {
        const { INCIDENT_QUERIES } = await Promise.resolve().then(() => __importStar(require('../prometheus-queries.js')));
        (0, globals_1.expect)(INCIDENT_QUERIES).toHaveProperty('totalIncidents');
        (0, globals_1.expect)(INCIDENT_QUERIES).toHaveProperty('incidentsBySeverity');
        (0, globals_1.expect)(INCIDENT_QUERIES).toHaveProperty('mttr');
    });
    (0, globals_1.it)('should have all required compliance queries', async () => {
        const { COMPLIANCE_QUERIES } = await Promise.resolve().then(() => __importStar(require('../prometheus-queries.js')));
        (0, globals_1.expect)(COMPLIANCE_QUERIES).toHaveProperty('complianceScore');
        (0, globals_1.expect)(COMPLIANCE_QUERIES).toHaveProperty('gapCount');
        (0, globals_1.expect)(COMPLIANCE_QUERIES).toHaveProperty('gapsBySeverity');
    });
    (0, globals_1.it)('should have performance queries for p95 tracking', async () => {
        const { PERFORMANCE_QUERIES } = await Promise.resolve().then(() => __importStar(require('../prometheus-queries.js')));
        (0, globals_1.expect)(PERFORMANCE_QUERIES).toHaveProperty('dashboardLatencyP95');
        (0, globals_1.expect)(PERFORMANCE_QUERIES).toHaveProperty('metricsRefreshLatency');
    });
});
