# Claude AI Factory Runbooks

## Planner Failed Schema Validation
- **Symptoms**: `ai-factory-plan` workflow fails with a schema validation error.
- **Resolution**: Check the issue text for prompt injection or malformed instructions. Re-run with simplified text.

## Splitter Created Overlapping Child PR Scopes
- **Symptoms**: Multiple child PRs touch the same files, causing merge conflicts.
- **Resolution**: Ensure the plan explicitly demarcates paths for each work item. Modify `.claude/factory/planner.md` rules if recurrent.

## Architecture Review False Positive
- **Symptoms**: PR is blocked due to touching files not in the allowlist, but the change is legitimate.
- **Resolution**: Update `config/ai-factory/path-ownership.yml` to include the required paths.

## Policy Review Blocked Due To Secret Scanner
- **Symptoms**: Generated code is blocked for logging a suspected secret.
- **Resolution**: Verify if it's a false positive. If true positive, revert the PR and revise the implementer prompt.

## Self-Heal Safe Retry Succeeded
- **Symptoms**: `ai-factory-self-heal` succeeds and commits a fix.
- **Resolution**: No action required. Verify in the monitoring trends dashboard.

## Self-Heal Exhausted Retry Budget
- **Symptoms**: Self-heal attempts loop or fail continuously.
- **Resolution**: Intervene manually. The healer has a max retry limit.

## Branch-Protection Drift Detected
- **Symptoms**: Drift detector reports `policyDrift: true`.
- **Resolution**: Reconcile branch protection rules with `docs/ci/REQUIRED_CHECKS_POLICY.yml`.

## Release-Readiness Gate Blocked Merge
- **Symptoms**: `ai-factory-release-readiness` fails.
- **Resolution**: Check the blocked artifacts. Ensure all child workflows have passed successfully before proceeding.
