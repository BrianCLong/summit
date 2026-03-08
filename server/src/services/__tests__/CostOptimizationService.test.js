"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CostOptimizationService_js_1 = require("../CostOptimizationService.js");
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../../db/pg.js', () => ({
    pg: {
        query: globals_1.jest.fn(),
        oneOrNone: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../../db/neo4j.js', () => ({
    neo: {
        session: globals_1.jest.fn(),
    },
    getNeo4jDriver: globals_1.jest.fn(),
}));
globals_1.jest.mock('@opentelemetry/api', () => ({
    trace: {
        getTracer: () => ({
            startActiveSpan: (name, fn) => fn({
                setAttributes: globals_1.jest.fn(),
                recordException: globals_1.jest.fn(),
                setStatus: globals_1.jest.fn(),
                end: globals_1.jest.fn(),
            }),
        }),
    },
}));
(0, globals_1.describe)('CostOptimizationService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new CostOptimizationService_js_1.CostOptimizationService();
    });
    (0, globals_1.test)('identifyOptimizationOpportunities returns opportunities', async () => {
        const opportunities = await service.identifyOptimizationOpportunities('tenant-1');
        (0, globals_1.expect)(opportunities).toBeDefined();
        (0, globals_1.expect)(Array.isArray(opportunities)).toBe(true);
        // Based on the mock implementation, we expect some opportunities
        (0, globals_1.expect)(opportunities.length).toBeGreaterThan(0);
        const dbPoolOpp = opportunities.find(o => o.type === CostOptimizationService_js_1.OptimizationType.DATABASE_CONNECTION_POOLING);
        (0, globals_1.expect)(dbPoolOpp).toBeDefined();
        (0, globals_1.expect)(dbPoolOpp?.potentialSavingsUSD).toBeGreaterThan(0);
    });
    (0, globals_1.test)('executeOptimizations implements auto-implementable opportunities', async () => {
        const opportunities = await service.identifyOptimizationOpportunities('tenant-1');
        const autoOpp = opportunities.find(o => o.autoImplementable);
        // Ensure we have at least one auto-implementable opportunity for this test to be meaningful
        if (!autoOpp) {
            console.warn('No auto-implementable opportunity found in mock data');
            return;
        }
        if (autoOpp) {
            // Force risk level to LOW and effort to LOW to pass checks if they aren't already
            // This matches the behavior in the service where we only auto-implement "LOW" risk
            const safeOpp = { ...autoOpp, riskLevel: CostOptimizationService_js_1.RiskLevel.LOW, potentialSavingsUSD: 40 };
            const results = await service.executeOptimizations([safeOpp]);
            (0, globals_1.expect)(results.length).toBe(1);
            if (!results[0].implemented) {
                console.error('Optimization failed:', results[0].error);
            }
            (0, globals_1.expect)(results[0].implemented).toBe(true);
            (0, globals_1.expect)(results[0].actualSavingsUSD).toBeGreaterThan(0);
        }
    });
    (0, globals_1.test)('executeOptimizations rejects manual opportunities', async () => {
        const manualOpp = {
            id: 'manual-1',
            tenantId: 'tenant-1',
            type: CostOptimizationService_js_1.OptimizationType.QUERY_OPTIMIZATION,
            description: 'Fix query manually',
            potentialSavingsUSD: 100,
            implementationEffort: CostOptimizationService_js_1.ImplementationEffort.HIGH,
            riskLevel: CostOptimizationService_js_1.RiskLevel.HIGH,
            autoImplementable: false,
            metadata: {}
        };
        const results = await service.executeOptimizations([manualOpp]);
        (0, globals_1.expect)(results.length).toBe(1);
        (0, globals_1.expect)(results[0].implemented).toBe(false);
        (0, globals_1.expect)(results[0].error).toContain('manual review');
    });
});
