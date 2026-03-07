# Autonomous Codebase Governor Runbook

## Failure Modes & Mitigation
1. **Governor Latency Regression**: Ensure tools respond in < 120s. Rollback rule if threshold breached.
2. **False-Positive Spike**: Quickly move offending rule to Advisory mode.
3. **Remediation PR Reject Spike**: Refine allowlist or disable auto-remediation flag.
4. **Branch Policy Mismatch**: Sync branch protection rules via `scripts/release/reconcile_branch_protection.sh`.

## Disabling a Rule
Modify the policy file to set the rule's `mode` to `advisory` or remove it entirely. Wait for next pipeline run.

## Alert Routing
- Tier 1: Platform Engineering On-Call
