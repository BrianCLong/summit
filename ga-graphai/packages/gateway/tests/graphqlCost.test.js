"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const simpleQuery = `query Entries($category: String) {
  ledgerEntries(category: $category) {
    id
    category
    actor
  }
}`;
(0, vitest_1.describe)('GraphQL cost analyzer', () => {
    (0, vitest_1.it)('derives plan metrics for GraphQL queries', () => {
        const runtime = new index_js_1.GatewayRuntime();
        const analyzer = new index_js_1.GraphQLCostAnalyzer(runtime.getSchema());
        const plan = analyzer.analyze(simpleQuery);
        (0, vitest_1.expect)(plan.operations).toBeGreaterThan(0);
        (0, vitest_1.expect)(plan.depth).toBeGreaterThan(0);
        (0, vitest_1.expect)(plan.containsCartesianProduct).toBe(false);
    });
});
(0, vitest_1.describe)('GraphQL rate limiter', () => {
    (0, vitest_1.it)('throttles when tenant concurrency exceeds limits', () => {
        const runtime = new index_js_1.GatewayRuntime();
        const limiter = new index_js_1.GraphQLRateLimiter(runtime.getSchema(), {
            defaultProfile: {
                tenantId: 'tenant-a',
                maxRru: 500,
                maxLatencyMs: 5000,
                concurrencyLimit: 1,
            },
        });
        const first = limiter.beginExecution(simpleQuery, 'tenant-a');
        (0, vitest_1.expect)(first.decision.action).toBe('allow');
        const second = limiter.beginExecution(simpleQuery, 'tenant-a');
        (0, vitest_1.expect)(second.decision.action).toBe('throttle');
        first.release?.(120);
        const afterRelease = limiter.beginExecution(simpleQuery, 'tenant-a');
        (0, vitest_1.expect)(afterRelease.decision.action).toBe('allow');
    });
});
(0, vitest_1.describe)('GatewayRuntime cost guard', () => {
    (0, vitest_1.it)('rejects queries that trigger cartesian safeguards', async () => {
        const runtime = new index_js_1.GatewayRuntime({
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
        (0, vitest_1.expect)(result.errors?.[0].extensions?.code).toBe('COST_GUARD_KILL');
        const plan = (result.errors?.[0].extensions).plan;
        (0, vitest_1.expect)(plan?.containsCartesianProduct).toBe(true);
    });
});
