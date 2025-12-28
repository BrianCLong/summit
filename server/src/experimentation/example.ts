/**
 * Experimentation Example
 *
 * Demonstrates how to use the ExperimentationService for A/B testing.
 */

import { experimentationService } from './index.js';

async function runExample() {
  const tenantId = 'tenant-123';
  const userId = 'user-123';
  const experimentId = 'sample-experiment';

  // Get experiment assignment for user
  const assignment = await experimentationService.getAssignment(experimentId, {
    userId,
    tenantId,
    attributes: { plan: 'pro', region: 'us-east' },
    consent: true,
  });

  if (assignment.data) {
    console.log(`User ${userId} assigned to variant: ${assignment.data.variantId}`);

    // Track a conversion metric
    await experimentationService.trackMetric(
      experimentId,
      userId,
      'conversion',
      1
    );
  } else {
    console.log('User not eligible for experiment or experiment not running');
  }
}

runExample().catch(console.error);
