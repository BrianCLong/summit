export function evaluateMergeReadiness(artifacts: any[], policyState: any) {
  const missingArtifacts = !artifacts || artifacts.length === 0;
  const policyDrift = policyState.driftDetected;

  const blockers = [];
  if (missingArtifacts) blockers.push("Missing required artifacts");
  if (policyDrift) blockers.push("Branch protection policy drift detected");

  return {
    passed: blockers.length === 0,
    blockers,
    required_checks: ["CI Core", "Unit Tests & Coverage"],
    policy_drift: policyDrift,
    recommendation: blockers.length === 0 ? "merge" : "block"
  };
}
