import { selfRemediationService, ResourceHealth } from '../../src/services/SelfRemediationService.js';
import { logger } from '../../src/config/logger.js';

/**
 * Task #116: Self-Remediating Infrastructure Drill.
 * Validates predictive failure detection and autonomous reprovisioning.
 */
async function runSelfRemediationDrill() {
  logger.info('🚀 Starting Self-Remediating Infrastructure Drill');

  // Simulate a resource nearing failure
  const leakingResource: ResourceHealth = {
    resourceId: 'summit-api-container-04',
    type: 'container',
    cpuUsage: 45,
    memoryUsage: 96,
    errorRate: 0.02,
    latencyMs: 120,
    prediction: 'imminent_failure'
  };

  console.log('--- Step 1: Health Analysis & Failure Prediction ---');
  const plan = await selfRemediationService.analyzeHealth(leakingResource);

  if (!plan) {
    throw new Error('Failure Prediction failed: No remediation plan generated');
  }

  console.log('Action Recommended: ' + plan.action);
  console.log('Confidence: ' + plan.confidence);

  if (plan.action !== 'reprovision') {
    throw new Error('Incorrect remediation strategy');
  }

  console.log('--- Step 2: Autonomous Execution ---');
  const success = await selfRemediationService.executeRemediation(plan);

  if (success) {
    logger.info('✅ Self-Remediation Operational');
    process.exit(0);
  } else {
    logger.error('❌ Self-Remediation Execution Failed');
    process.exit(1);
  }
}

runSelfRemediationDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});