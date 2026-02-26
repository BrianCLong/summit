# Orchestrator Runbook

## Purpose

Operate the deterministic DAG orchestrator in `agents/orchestrator/src/dag`.

## Enablement

- Feature flag: `SUMMIT_ORCHESTRATOR_V1=true`
- Default posture: flag OFF (fail closed)

## Operator Checks

1. Validate graph is acyclic before execution.
2. Confirm edge policy allowlist only includes required cross-agent tools.
3. Run deterministic replay test to confirm identical report hash.

## Incident Response

### Policy Violation Storm

- Signal: repeated `DagPolicyError` for the same edge/tool
- Immediate action:
  1. Keep feature flag OFF for impacted workflow if blast radius is unknown.
  2. Verify allowlist intent and agent role mapping.
  3. Re-enable only after policy fix + deterministic replay pass.

### DAG Validation Failure Rate >5%

- Signal: frequent cycle rejection during compile/execute
- Immediate action:
  1. Audit workflow generation source.
  2. Add upstream DAG linting before runtime handoff.
  3. Block promotion until cycle rate returns below threshold.

## Rollback

- Primary rollback: set `SUMMIT_ORCHESTRATOR_V1=false`.
- Secondary rollback: revert DAG orchestrator module changes and re-run orchestrator tests.

## SLO Targets (Current)

- Successful orchestrations: 99%
- Policy false positives: <1%
