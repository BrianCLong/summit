# Required Checks for ACP Integration

## GitHub Actions Gates
* `ci/summit-acp-verify` (Proposed): Runs `scripts/ci/verify_acp_bundle.py`.
* `ci/policy_deny_default`: Ensures default policy is deny.

## Temporary gate names used by this PR stack
- ci/evidence-validate
- ci/unit
- ci/security-neverlog

## How to discover required checks
1. Open a recent merged PR in the target repo.
2. Find the “Checks” section and note checks marked as “Required”.
3. Alternatively (GitHub): Settings → Branches → Branch protection rules → Required status checks.

## Rename plan
Once real names are known, add a tiny PR to rename the temporary gate labels in docs and CI config.
