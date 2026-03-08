# AgentPlace Operational Runbook

## CI Failures
If the `AgentPlace Policy Gates` fail:
1. Check the `report.json` in the CI artifacts.
2. Identify the high-risk findings in the manifest.
3. Either reduce the requested capabilities/scopes or request a governance exception.

## False Positive Override
If the evaluator incorrectly flags a manifest:
1. Add an exception record to `governance/exceptions/agentplace/`.
2. Update the risk model weights if the penalty is universally too high.

## Disabling the Feature
To disable AgentPlace evaluation:
1. Set the feature flag `SUMMIT_AGENTPLACE_ENABLED=false` in the repository variables.
2. This will cause the CI gates to skip evaluation.

## Rollback
Rollback is achieved by disabling the feature flag or reverting the PR that introduced the change to the evaluator or risk model.
