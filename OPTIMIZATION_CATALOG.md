# Optimization Catalog

Catalog of authorized optimization loops with status, dependencies, and validation coverage.

## Loop Summary

| Loop ID | Class | Objective                                                | Mode                         | Current Status                                     | Dependencies                                                | Validation Coverage                                             |
| ------- | ----- | -------------------------------------------------------- | ---------------------------- | -------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| L-A1    | A     | Reduce prompt token cost with accuracy parity            | Advisory/Active (per policy) | Ready for advisory execution with rollback plan    | Prompt registry, token analytics, semantic regression suite | Regression tests, semantic diff checks, receipt emission        |
| L-B1    | B     | Improve retry yield without latency regression           | Advisory/Active              | Approved for limited rollout with per-service caps | Telemetry pipeline, feature flagging, SLO dashboards        | Load-test simulations, health checks, receipt & rollback drills |
| L-C1    | C     | Increase throughput while respecting P99 and queue depth | Advisory/Active              | Ready for controlled experiments                   | Queue metrics, concurrency config store, incident hooks     | Load test harness, saturation monitors, rollback verification   |
| L-D1    | D     | Detect over-broad scopes and recommend least privilege   | Advisory                     | Enabled in advisory-only mode                      | Policy graph analyzer, access logs, governance review queue | Static analysis, manual review receipts                         |

## Eligibility Rules

- Required signals and budgets are defined in `docs/optimization/POLICY_MATRIX.md`.
- Loops must have entries in `docs/optimization/LOOP_REGISTRY.md` and emit receipts per `docs/optimization/RECEIPTS.md`.
- New loops must specify class, objective function, allowed actions, hard caps, and rollback strategy before activation.
- OPA policy-as-code bundles live in `policy/optimization/` and must evaluate to allow before any action executes.

## Change Management

- Enable/disable via policy matrix and kill switch controls (`docs/optimization/KILL_SWITCH.md`).
- Promotion to active requires criteria in `docs/optimization/PROMOTION_MODEL.md`.
- Benefit aggregation and reporting follow `docs/optimization/BENEFIT_DASHBOARD.md`.

## Non-Goals

- No self-authorizing loops.
- No cross-tenant optimizations.
- No silent parameter drift; every change must generate a receipt and rollback pointer.
