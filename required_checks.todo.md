# Required Checks for ACP Integration

## GitHub Actions Gates
* `ci/summit-acp-verify` (Proposed): Runs `scripts/ci/verify_acp_bundle.py`.
* `ci/policy_deny_default`: Ensures default policy is deny.

## Manual Verification
* [ ] Verify `evidence/index.json` contains valid ACP evidence IDs.
* [ ] Verify `evidence/stamp.json` is the only file with timestamps.
