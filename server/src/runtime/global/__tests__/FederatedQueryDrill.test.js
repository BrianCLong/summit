"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const FederatedQueryPlanner_js_1 = require("../FederatedQueryPlanner.js");
(0, globals_1.describe)('Federated Mesh Query Drill (Task #111)', () => {
    const tenantId = 'global-investigator';
    (0, globals_1.it)('should decompose a global search query into multiple regional sub-queries', async () => {
        const query = 'MATCH (n:Person) WHERE n.name = "BadActor" RETURN n';
        const plan = await FederatedQueryPlanner_js_1.federatedQueryPlanner.planQuery(query, tenantId, { globalSearch: true });
        (0, globals_1.expect)(plan.subQueries.length).toBeGreaterThan(1);
        (0, globals_1.expect)(plan.mergeStrategy).toBe('UNION');
        // Verify push-down logic
        for (const sub of plan.subQueries) {
            (0, globals_1.expect)(sub.pushedDownFilters).toContain('tenant_isolation');
            (0, globals_1.expect)(sub.query).toContain(sub.region);
        }
    });
    (0, globals_1.it)('should use AGGREGATE strategy for count queries', async () => {
        const query = 'MATCH (n:Event) RETURN count(n)';
        const plan = await FederatedQueryPlanner_js_1.federatedQueryPlanner.planQuery(query, tenantId);
        (0, globals_1.expect)(plan.mergeStrategy).toBe('AGGREGATE');
    });
    (0, globals_1.it)('should correctly identify push-down filters from WHERE clauses', async () => {
        const query = 'MATCH (e:Entity) WHERE e.type = "indicator" RETURN e';
        const plan = await FederatedQueryPlanner_js_1.federatedQueryPlanner.planQuery(query, tenantId);
        (0, globals_1.expect)(plan.subQueries[0].pushedDownFilters).toContain('temporal_filter');
    });
});
