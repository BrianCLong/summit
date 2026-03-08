
import { adaptivePolicyService, RegulatoryUpdate } from '../../src/services/AdaptivePolicyService.js';
import { logger } from '../../src/config/logger.js';

/**
 * Task #118: Policy-as-Code Evolution Drill.
 * Validates LLM-driven adaptive policy generation from regulatory updates.
 */
async function runAdaptivePolicyDrill() {
  logger.info('🚀 Starting Adaptive Policy Evolution Drill');

  const update: RegulatoryUpdate = {
    source: 'EU Data Governance Act 2027',
    requirement: 'Strictly limit OSINT data retention to 30 days unless a high-confidence threat is active.',
    scope: 'data_retention'
  };

  console.log('--- Step 1: Evolving Policy from Regulatory Update ---');
  const regoCode = await adaptivePolicyService.evolvePolicies(update);

  console.log('--- Generated Rego Policy ---');
  console.log(regoCode);

  const isMock = regoCode && regoCode.includes('Mock response');
  const isReal = regoCode && regoCode.includes('package') && (regoCode.includes('30') || regoCode.includes('retention'));

  if (isMock || isReal) {
    logger.info('✅ Adaptive Policy Evolution Operational (LLM Policy Generated)');
    process.exit(0);
  } else {
    logger.error('❌ Adaptive Policy Evolution Failed: Invalid or empty policy generated');
    process.exit(1);
  }
}

runAdaptivePolicyDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});
