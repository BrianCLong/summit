
import { federatedQueryPlanner } from '../../src/runtime/global/FederatedQueryPlanner.js';
import { logger } from '../../src/config/logger.js';

/**
 * Task #111: Federated Query Drill.
 * Validates query decomposition and Push-Down Reasoning across the mesh.
 */
async function runFederatedQueryDrill() {
  logger.info('🚀 Starting Federated Query Drill');

  const tenantId = 'global-investigation-01';
  const query = 'MATCH (n:Person) WHERE n.name = "John Doe" RETURN n';

  console.log(`--- Step 1: Planning Global Query ---`);
  console.log(`Query: ${query}`);

  // Simulate a global search that hits multiple regions
  const plan = await federatedQueryPlanner.planQuery(query, tenantId, { globalSearch: true });

  console.log(`Merge Strategy: ${plan.mergeStrategy}`);
  console.log(`Target Regions: ${plan.subQueries.map(sq => sq.region).join(', ')}`);

  // 2. Validate Push-Down Reasoning
  console.log(`
--- Step 2: Validating Push-Down Reasoning ---`);
  for (const sq of plan.subQueries) {
    console.log(`Region ${sq.region}:`);
    console.log(`  Rewritten: ${sq.query}`);
    console.log(`  Pushed Down: ${sq.pushedDownFilters.join(', ')}`);

    if (!sq.pushedDownFilters.includes('tenant_isolation')) {
      throw new Error(`Push-down failure! Region ${sq.region} missing tenant_isolation filter.`);
    }
  }

  // 3. Operational Readiness
  console.log(`
--- Step 3: Operational Readiness ---`);
  if (plan.subQueries.length > 1 && plan.mergeStrategy === 'UNION') {
    logger.info('✅ Federated Mesh Query Planner Operational');
    process.exit(0);
  } else {
    logger.error('❌ Federation plan failed to meet requirements');
    process.exit(1);
  }
}

runFederatedQueryDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});
