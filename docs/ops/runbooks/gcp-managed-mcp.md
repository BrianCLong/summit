# Runbook: GCP Managed MCP

## Trigger Conditions

- Policy failures > 5/hour
- Drift detector flags endpoint/schema mismatch
- Query volume spike > 3x baseline

## Triage

1. Confirm feature flag state (`SUMMIT_GCP_MANAGED_MCP_ENABLED`).
2. Validate allowlisted tool/project policy inputs.
3. Confirm IAM scope includes read-only scope.
4. Run dry drift check:
   - `python3 scripts/monitoring/gcp-mcp-drift.py --dry-run`

## Failure Modes

- `feature_flag_disabled`: expected when rollout is off.
- `tool_not_allowed:*`: policy/config mismatch.
- `project_not_allowed:*`: wrong project binding.
- `row_limit_exceeds_policy`: payload exceeds cap.
- `missing_required_iam_scope`: identity/scope issue.

## Recovery

1. Fix policy config or caller payload.
2. Re-run probe:
   - `python3 scripts/mcp/gcp_probe.py --enable-feature`
3. Validate deterministic evidence outputs.
4. If drift persists, keep feature flag OFF and escalate through governance review.
