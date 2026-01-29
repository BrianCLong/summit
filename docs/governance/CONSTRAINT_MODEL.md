# Summit Constraint Model (Turn #7)

## Overview
This document defines the constraint-driven operating model for Summit. Unlike instruction-based automation, the Summit Agent Lattice operates by satisfying a set of continuous constraints.

## Principles
1. **Constraints > Instructions**: Agents must prioritize constraint satisfaction over task completion.
2. **Reversibility > Certainty**: Actions must be reversible or explicitly authorized as "one-way doors".
3. **Prevention > Velocity**: It is better to block a bad release than to ship a fast one.

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
