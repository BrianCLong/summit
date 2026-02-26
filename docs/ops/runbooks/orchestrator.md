# Orchestrator Operations Runbook

## Deployment
- Feature Flag: `SUMMIT_ORCHESTRATOR_V1` (Default: OFF)
- To enable: `export SUMMIT_ORCHESTRATOR_V1=true`

## Monitoring
- **Policy Violations**: Check logs for `Policy Violation: Unapproved data flow`.
- **DAG Cycles**: Orchestrator will fail with `Execution graph contains cycles`.
- **Determinism**: CI will fail if artifacts contain timestamps.

## Incident Response
- **Policy Storm**: If legitimate workflows are blocked, update the `allowed_edges` in the workflow YAML.
- **Rollback**: Flip the `SUMMIT_ORCHESTRATOR_V1` flag to `false`.
