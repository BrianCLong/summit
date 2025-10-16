// services/placement/decider.js
function decide(policy, meters) {
  if (policy.pinned) return policy.placement;

  var creditsLow = meters.aws.creditsUsd < 50 || meters.aws.freePlanDays < 14;
  var awsUnhealthy = meters.aws.errorRate > 0.02 || meters.aws.p95ms > 600;
  var ociUnhealthy = meters.oci.errorRate > 0.02 || meters.oci.p95ms > 600;

  if (policy.placement === 'auto') {
    if (creditsLow || awsUnhealthy) return ociUnhealthy ? 'aws' : 'oci';
    return 'aws'; // prefer AWS while credits last for serverless savings
  }
  return policy.placement; // explicit override
}
module.exports = { decide };
