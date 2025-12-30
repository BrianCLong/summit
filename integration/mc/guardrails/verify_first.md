# Verify-First Guardrail

Ensures policy and budget checks precede any module or transform execution.

## Steps

- Validate subject context, purpose, and authorization tokens.
- Compute applicable budgets (execution, egress, sensitivity) from policy.
- Abort execution if prerequisites or budget thresholds are not met; record witness entries.
