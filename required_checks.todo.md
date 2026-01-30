# Required Checks for ACP Integration

## GitHub Actions Gates
* `ci/summit-acp-verify` (Proposed): Runs `scripts/ci/verify_acp_bundle.py`.
* `ci/policy_deny_default`: Ensures default policy is deny.

## Temporary gate names (until discovered)
- ci/privacy-graph-gate
- ci/deps-delta-gate
- summit-ci/verify-evidence
- summit-ci/dependency-delta
