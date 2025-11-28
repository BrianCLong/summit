import { describe, expect, it } from 'vitest';
import type { QueryPlanSummary } from '@ga-graphai/cost-guard';
import {
  GatewayRuntime,
  GraphQLCostAnalyzer,
  GraphQLRateLimiter,
} from '../src/index.js';

const simpleQuery = `query Entries($category: String) {
  ledgerEntries(category: $category) {
    id
    category
    actor
  }
}`;

describe('GraphQL cost analyzer', () => {
  it('derives plan metrics for GraphQL queries', () => {
    const runtime = new GatewayRuntime();
    const analyzer = new GraphQLCostAnalyzer(runtime.getSchema());
    const plan = analyzer.analyze(simpleQuery);

    expect(plan.operations).toBeGreaterThan(0);
    expect(plan.depth).toBeGreaterThan(0);
    expect(plan.containsCartesianProduct).toBe(false);
  });
});

describe('GraphQL rate limiter', () => {
  it('throttles when tenant concurrency exceeds limits', () => {
    const runtime = new GatewayRuntime();
    const limiter = new GraphQLRateLimiter(runtime.getSchema(), {
      defaultProfile: {
        tenantId: 'tenant-a',
        maxRru: 500,
        maxLatencyMs: 5000,
        concurrencyLimit: 1,
      },
    });

    const first = limiter.beginExecution(simpleQuery, 'tenant-a');
    expect(first.decision.action).toBe('allow');
    const second = limiter.beginExecution(simpleQuery, 'tenant-a');
    expect(second.decision.action).toBe('throttle');
    first.release?.(120);
    const afterRelease = limiter.beginExecution(simpleQuery, 'tenant-a');
    expect(afterRelease.decision.action).toBe('allow');
  });
});

describe('GatewayRuntime cost guard', () => {
  it('rejects queries that trigger cartesian safeguards', async () => {
    const runtime = new GatewayRuntime({
      costGuard: {
        defaultTenantId: 'guarded',
      },
    });

    const heavyQuery = `query Heavy {
      workOrders {
        tasks {
          logs
        }
      }
    }`;

    const result = await runtime.execute(heavyQuery, undefined, { tenantId: 'guarded' });
    expect(result.errors?.[0].extensions?.code).toBe('COST_GUARD_KILL');
    const plan = (result.errors?.[0].extensions as { plan?: QueryPlanSummary }).plan;
    expect(plan?.containsCartesianProduct).toBe(true);
  });
});
