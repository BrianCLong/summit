# Promotion Model (Advisory → Active)

Defines how loops graduate from advisory to active modes with safeguards, evidence requirements, and demotion rules.

## Promotion Criteria

- **Accuracy & Benefit:**
  - Demonstrated ≥2 successful dry-runs with observed benefit matching expected outcomes within ±10%.
  - Zero policy violations or budget overages during trial.
- **Stability Duration:**
  - Minimum 7 days of stable advisory performance with no regressions against control metrics.
- **Safety Checks:**
  - No incidents or SLO burns attributed to the loop during the trial window.
  - Rollback drills executed at least once with successful verification.

## Approval Workflow

- **Approvers:** Governance lead + domain DRI (SRE for B/C classes; Security Architect for D; Platform Eng for A).
- **Evidence Required:**
  - Receipts showing trigger signals, actions, and observed outcomes.
  - Budget consumption history and remaining headroom.
  - Simulation or shadow-run artifacts demonstrating expected impact.
  - Rollback verification logs.
- **Time-boxed Approval:**
  - Approvals expire after 30 days or 5 executed actions (whichever comes first). Renewal requires re-review.

## Auto-Demotion Rules

- Confidence drop (e.g., success delta worse than -5% vs. baseline) for two consecutive runs.
- Harm detection: any SLO violation, incident flag, or security alert linked to the loop.
- Budget overrun or missing signals; loop reverts to advisory or disabled state until a new approval.
- Demotion emits a high-severity receipt and triggers rollback to last-known-good configuration.

## Promotion Paths by Loop

- **L-A1:** Promote after consistent token savings without accuracy loss; requires human prompt review.
- **L-B1:** Promote after improved retry yield with no P95 regression and verified rollback.
- **L-C1:** Promote after throughput gain with stable P99 and queue depth; requires load test evidence.
- **L-D1:** Promotion optional; if promoted, must restrict to policy bundles with automatic pre/post simulation.
