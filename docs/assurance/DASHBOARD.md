# Executive Assurance Dashboard (Read-Only)

This dashboard blueprint gives leadership a defensible, evidence-linked view of autonomy performance without exposing operational complexity.

## 1. High-Level Views

- **Autonomy Activity Summary:** Actions by tier, promotions/demotions, near-misses, kill-switch activations. Default timeframes: last 30 days and quarter-to-date.
- **Risk Heatmap:** Composite risk score by category (Safety, Cost, SLA, Stability, Reputation) with tolerance bands and trend arrows.
- **Value Delivered:** Net value vs. exposure with confidence interval; highlights top three value drivers and reserves held for risk mitigation.

## 2. Drill-Down Paths (from metric to evidence)

1. **Metric → Receipt:** Clicking any metric opens the underlying action receipt with tier, policy decision ID, and control outcomes.
2. **Receipt → Evidence:** Receipt links to immutable audit log entries, policy evaluation traces, and simulation artifacts.
3. **Risk → Control → Outcome:** Selecting a heatmap cell reveals which controls fired, what was prevented, and the verified outcome (e.g., rollback completed).
4. **Value Card → Counterfactual:** The value card links to the “no-autonomy” simulation for the same window to show the delta.

## 2.1 Evidence Trace Requirements

- Every drill-down step must preserve **context breadcrumbs** (metric → receipt → evidence) for auditors.
- Evidence links are **immutable** (hash + timestamp) and open in read-only mode.
- Evidence is **time-bounded** to the selected snapshot to avoid mixing periods.

## 3. Time-Bound Snapshots

- **Monthly (Board):** Fixed cut on the first calendar day; includes governance notes and delegated approvals expiring within 30 days.
- **Quarterly (Regulator-ready):** Locked snapshot with signatures, hash, and export packaging (PDF + JSON evidence index) for audits.
- **On-Demand Freeze:** Manual “freeze” button for ad-hoc reviews that generates a timestamped snapshot with immutable evidence pointers.

## 4. Core Queries Powering the Views

- **Actions by Tier (last 30 days):**
  - `SELECT executed_tier, COUNT(*) AS actions FROM autonomy_actions WHERE status='completed' AND ts >= now() - interval '30 days' GROUP BY executed_tier;`
- **Promotions/Demotions:**
  - `SELECT transition, COUNT(*) FROM autonomy_state_transitions WHERE ts >= :window GROUP BY transition;` where `transition IN ('promotion','demotion')` and `trigger_reason` is stored for annotations.
- **Kill-Switch Activations:**
  - `SELECT initiator, reason, scope, pause_duration, verified FROM control_invocations WHERE control='kill' AND ts >= :window;`
- **Near-Misses:**
  - `SELECT category, COUNT(*) AS blocked, SUM(potential_impact) AS avoided_cost FROM prevented_actions WHERE ts >= :window;`
- **Value vs Exposure:**
  - `SELECT SUM(savings + revenue_uplift + toil_reduction_value) AS value, SUM(risk_reserve + mitigation_cost) AS exposure FROM autonomy_value_realization WHERE ts BETWEEN :start AND :end;`

## 4.1 Data Dictionary (board-facing)

| Field                  | Meaning                                         | Units       | Source Table/Log             |
| ---------------------- | ----------------------------------------------- | ----------- | ---------------------------- |
| `executed_tier`        | Autonomy tier used to execute the action.       | Tier (0-3)  | `autonomy_actions`           |
| `risk_score`           | Composite risk score per taxonomy.              | 0-100       | `risk_scores`                |
| `near_miss_impact`     | Estimated avoided cost or incident severity.    | USD / score | `prevented_actions`          |
| `pause_duration`       | Time autonomy was paused via kill-switch.       | seconds     | `control_invocations`        |
| `value_net`            | Net value delivered minus exposure reserves.    | USD         | `autonomy_value_realization` |
| `counterfactual_delta` | Value/risk delta vs. lower autonomy simulation. | USD / score | Simulation engine outputs    |
| `approval_token_id`    | Approval record linked to action.               | UUID        | `delegation_records`         |

## 5. Presentation Standards

- **Freshness labels:** Every card shows “Updated <timestamp> UTC” and data window.
- **Color semantics:** Green/Yellow/Red only for tolerance bands defined in the taxonomy; no custom palettes.
- **Footnotes:** Each card links to evidence indices; no raw logs displayed in UI.

## 6. Access & Permissions

- Read-only for executives and regulators; export limited to signed PDFs and JSON evidence indices.
- No ability to trigger actions; controls (pause/downgrade) remain in operational consoles but are linked for visibility.

## 7. Operationalization Checklist

- [ ] Queries wired to read replicas with caching to avoid production impact.
- [ ] Snapshots are immutable and signed; hash stored in provenance ledger.
- [ ] Dashboard URLs include the snapshot timestamp to avoid ambiguity.
- [ ] Data dictionary aligns with `AUTONOMY_RISK_TAXONOMY.md` definitions.
- [ ] Evidence traces resolve within two clicks from any metric card.
