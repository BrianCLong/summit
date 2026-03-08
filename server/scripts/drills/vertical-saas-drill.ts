
import { verticalSaaSManager } from '../../src/services/VerticalSaaSManager.js';
import { logger } from '../../src/config/logger.js';

/**
 * Task #123: Vertical SaaS Packs Drill.
 * Validates activation of industry-specific playbooks and outcomes SLAs.
 */
async function runVerticalSaaSDrill() {
  logger.info('🚀 Starting Vertical SaaS Pack Drill');

  const tenantId = 'global-bank-01';
  const packId = 'pack-finance-01';

  console.log('--- Step 1: Activating Financial Integrity Pack ---');
  await verticalSaaSManager.activatePack(packId, tenantId);

  console.log('--- Step 2: Verifying Outcomes-based SLA Compliance ---');
  const status = await verticalSaaSManager.checkSLACompliance(packId);

  console.log('SLA Compliant: ' + status.compliant);
  console.log('Metric Drift: ' + status.drift);

  if (status.compliant && status.drift < 0.05) {
    logger.info('✅ Vertical SaaS Packs Operational (Industry playbooks & SLAs verified)');
    process.exit(0);
  } else {
    logger.error('❌ Vertical SaaS SLA Failure');
    process.exit(1);
  }
}

runVerticalSaaSDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});
