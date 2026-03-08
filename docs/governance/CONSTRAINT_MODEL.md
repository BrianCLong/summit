> Owner: @summit/governance
> Last-Reviewed: 2026-02-25
> Evidence-IDs: EVD-PLACEHOLDER
> Status: active


## The Registry
The authoritative source of constraints is `governance/constraints.yaml`. This file is consumed by:
- **Release Gates**: To block non-compliant artifacts.
- **Infra Agents**: To optimize resource allocation.
- **FinOps Agents**: To enforce capital efficiency.

## Enforcement
Constraints are enforced at three levels:
1. **Static Analysis**: Linting and configuration checks (e.g., dependency freshness).
2. **Dynamic Gating**: Runtime checks during CI/CD (e.g., latency budgets).
3. **Continuous Monitoring**: Post-deployment reconciliation (e.g., error budget burn).

## Reversibility
Every constraint violation triggers a reversibility strategy:
- **Rollback**: Revert to the last known good state.
- **Drain**: Shift traffic away from the violating component.
- **Kill**: Terminate the violating process or experiment.
