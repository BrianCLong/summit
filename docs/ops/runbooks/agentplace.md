# AgentPlace Operational Runbook

## Service
AgentPlace Governance Module

## Purpose
Evaluates risk of autonomous agents before deployment or interaction.

## Common Issues

### CI Failure: High Risk Score
**Symptom**: `AgentPlace Policy Check` fails with exit code 1.
**Remediation**:
1. Check CI logs for `POLICY VIOLATION`.
2. Inspect `score` and `violations` in the report.
3. Reduce capabilities/permissions in the manifest or request manual approval override.

### CI Failure: Schema Validation
**Symptom**: `Schema validation failed`.
**Remediation**:
1. Validate manifest against `modules/agentplace/schemas/agent_manifest.schema.json`.
2. Fix missing fields or invalid values.

### CI Failure: Performance Budget
**Symptom**: `PERFORMANCE FAILURE`.
**Remediation**:
1. Check `metrics.json`.
2. Ensure CI runner is healthy.
3. Optimize `evaluator.py` if latency persists.

## Emergency Rollback
Disable the feature by setting `SUMMIT_AGENTPLACE_ENABLED=false` in CI environment variables (if feature flag implemented).
