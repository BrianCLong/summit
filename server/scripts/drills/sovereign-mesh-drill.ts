
import { federatedQueryPlanner } from '../../src/runtime/global/FederatedQueryPlanner.js';
import { logger } from '../../src/config/logger.js';

/**
 * Task #113: Sovereign Mesh Query Drill.
 * Validates cross-region query execution with Differential Privacy guards.
 */
async function runSovereignMeshDrill() {
  logger.info('🚀 Starting Sovereign Mesh Query Drill');

  const tenantId = 'global-investigation-01';
  const query = 'MATCH (n:Person) RETURN count(n)';

  console.log(`
--- Step 1: Planning Global Aggregate Query ---`);
  // Trigger global search to force multi-region plan
  const plan = await federatedQueryPlanner.planQuery(query, tenantId, { globalSearch: true });

  console.log(`Strategy: ${plan.mergeStrategy}`);
  console.log(`Regions: ${plan.subQueries.map(sq => sq.region).join(', ')}`);

  if (plan.mergeStrategy !== 'AGGREGATE' || plan.subQueries.length < 2) {
    throw new Error('Drill requires a multi-region AGGREGATE plan');
  }

  console.log(`
--- Step 2: Executing with Sovereign Guards ---`);
  const result = await federatedQueryPlanner.executeFederatedQuery(plan);

  console.log('Result:', JSON.stringify(result, null, 2));

  if (!result.isApproximation) {
    throw new Error('Differential Privacy was NOT applied to cross-region aggregate');
  }

  logger.info('✅ Sovereign Mesh Query Operational (DP Applied)');
  process.exit(0);
}

runSovereignMeshDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});
