# Cost Guard Controls

## Objectives
- Prevent quota overruns during demos and chaos drills while preserving analyst productivity.
- Provide governance-friendly audit trail for overrides and tuning actions.

## Architecture
- **Inputs:** billing metrics (`cpu_hours`, `query_units`, `storage_gb`), policy registry thresholds, tenant budget caps.
- **Processing:**
  - Rule engine evaluates thresholds per tenant, service, and environment.
  - Modes: `advisory`, `enforced`, `learning` (records but does not block).
  - Anomaly detector (3-sigma with seasonality) triggers soft alerts; policy hits trigger hard blocks.
- **Outputs:**
  - Decision `{ allowed, reason, policyId, severity, recommendedAction }`.
  - Events emitted to provenance ledger (`cost.guard.decided`) with hash chain context.

## KPIs
- 90%+ of real cost excursions flagged within 5 minutes.
- 80%+ of adversarial overage attempts blocked in chaos drills.
- False positive rate <5% in advisory mode on demo data.

## Runbook Hooks
- Threshold tuning documented in `runbooks/R3_cost_guard_rollback.md`.
- Overage chaos scenario in `runbooks/R2_resilience_demo.md` and `chaos/experiments.md`.
- Dashboards reference `$ per insight` metric via FinOps exporter.

## Policy Examples
- **Budget cap:** Block when monthly projected spend > budget *1.05.
- **Query unit surge:** Alert when 15-minute rolling mean exceeds baseline by 3x; block if sustained for 3 windows.
- **Storage creep:** Advisory when storage growth >10% week-over-week for demo tenant.

## Data & Reproducibility
- Seeded usage traces produced by `scripts/generate_demo_data.py` with `--kind usage` to simulate quota burn.
- Guard decisions stored with checksum of fixture batch for repeatable replay.
