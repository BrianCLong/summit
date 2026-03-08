"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FederatedQueryPlanner_js_1 = require("../../src/runtime/global/FederatedQueryPlanner.js");
const logger_js_1 = require("../../src/config/logger.js");
/**
 * Task #113: Sovereign Mesh Query Drill.
 * Validates cross-region query execution with Differential Privacy guards.
 */
async function runSovereignMeshDrill() {
    logger_js_1.logger.info('🚀 Starting Sovereign Mesh Query Drill');
    const tenantId = 'global-investigation-01';
    const query = 'MATCH (n:Person) RETURN count(n)';
    console.log(`
--- Step 1: Planning Global Aggregate Query ---`);
    // Trigger global search to force multi-region plan
    const plan = await FederatedQueryPlanner_js_1.federatedQueryPlanner.planQuery(query, tenantId, { globalSearch: true });
    console.log(`Strategy: ${plan.mergeStrategy}`);
    console.log(`Regions: ${plan.subQueries.map(sq => sq.region).join(', ')}`);
    if (plan.mergeStrategy !== 'AGGREGATE' || plan.subQueries.length < 2) {
        throw new Error('Drill requires a multi-region AGGREGATE plan');
    }
    console.log(`
--- Step 2: Executing with Sovereign Guards ---`);
    const result = await FederatedQueryPlanner_js_1.federatedQueryPlanner.executeFederatedQuery(plan);
    console.log('Result:', JSON.stringify(result, null, 2));
    if (!result.isApproximation) {
        throw new Error('Differential Privacy was NOT applied to cross-region aggregate');
    }
    logger_js_1.logger.info('✅ Sovereign Mesh Query Operational (DP Applied)');
    process.exit(0);
}
runSovereignMeshDrill().catch(err => {
    console.error('❌ Drill Failed:', err);
    process.exit(1);
});
