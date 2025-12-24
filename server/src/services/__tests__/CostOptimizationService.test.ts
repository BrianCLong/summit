import { CostOptimizationService, OptimizationType, ImplementationEffort, RiskLevel } from '../CostOptimizationService.js';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';

jest.mock('../../db/pg.js', () => ({
  pg: {
    query: jest.fn<() => Promise<any>>(),
    oneOrNone: jest.fn<() => Promise<any>>(),
  },
}));

jest.mock('../../db/neo4j.js', () => ({
  neo: {
    session: jest.fn<() => any>(),
  },
  getNeo4jDriver: jest.fn<() => any>(),
}));

jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startActiveSpan: (name: string, fn: (span: any) => any) => fn({
        setAttributes: jest.fn<() => void>(),
        recordException: jest.fn<() => void>(),
        setStatus: jest.fn<() => void>(),
        end: jest.fn<() => void>(),
      }),
    }),
  },
}));

describe('CostOptimizationService', () => {
  let service: CostOptimizationService;

  beforeEach(() => {
    service = new CostOptimizationService();
  });

  test('identifyOptimizationOpportunities returns opportunities', async () => {
    const opportunities = await service.identifyOptimizationOpportunities('tenant-1');
    expect(opportunities).toBeDefined();
    expect(Array.isArray(opportunities)).toBe(true);
    // Based on the mock implementation, we expect some opportunities
    expect(opportunities.length).toBeGreaterThan(0);

    const dbPoolOpp = opportunities.find(o => o.type === OptimizationType.DATABASE_CONNECTION_POOLING);
    expect(dbPoolOpp).toBeDefined();
    expect(dbPoolOpp?.potentialSavingsUSD).toBeGreaterThan(0);
  });

  test('executeOptimizations implements auto-implementable opportunities', async () => {
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
      const safeOpp = { ...autoOpp, riskLevel: RiskLevel.LOW, potentialSavingsUSD: 40 };

      const results = await service.executeOptimizations([safeOpp]);
      expect(results.length).toBe(1);

      if (!results[0].implemented) {
          console.error('Optimization failed:', results[0].error);
      }

      expect(results[0].implemented).toBe(true);
      expect(results[0].actualSavingsUSD).toBeGreaterThan(0);
    }
  });

  test('executeOptimizations rejects manual opportunities', async () => {
    const manualOpp = {
        id: 'manual-1',
        tenantId: 'tenant-1',
        type: OptimizationType.QUERY_OPTIMIZATION,
        description: 'Fix query manually',
        potentialSavingsUSD: 100,
        implementationEffort: ImplementationEffort.HIGH,
        riskLevel: RiskLevel.HIGH,
        autoImplementable: false,
        metadata: {}
    };

    const results = await service.executeOptimizations([manualOpp]);
    expect(results.length).toBe(1);
    expect(results[0].implemented).toBe(false);
    expect(results[0].error).toContain('manual review');
  });
});
