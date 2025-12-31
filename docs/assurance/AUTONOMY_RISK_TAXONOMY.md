# Autonomy Risk Taxonomy & Metrics

This taxonomy provides board-ready definitions for how autonomy risk is classified, measured, and reported. Each metric is evidence-backed and mapped to concrete controls so leadership can see risk posture in minutes.

## 1. Risk Categories (board-facing definitions)

| Category                       | Definition                                                                                                                                                                        | Evidence Sources                                                                                  | Default Alerting                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Safety & Policy Violations     | Any autonomous action that would break policy, legal, or safety boundaries. Includes prohibited data movement, geo-fencing violations, or actions outside pre-approved playbooks. | Policy engine decisions, enforcement logs, immutable audit ledger, data-loss-prevention triggers. | Immediate kill-switch evaluation; Sev-1 if executed; Sev-2 if blocked.     |
| Cost Overruns                  | Spend above budget caps or actions that expand variable cost exposure without approval.                                                                                           | Budget guardrails, cost-guard service, cloud billing feeds, pre-commit estimators.                | Alert at 80% of cap; automatic demotion at 100%.                           |
| SLA & Reliability Impact       | Actions that risk breaching SLOs (availability, latency, freshness). Includes changes to traffic routing, scaling, or dependency selection.                                       | SLO error budgets, progressive delivery logs, circuit breaker events, synthetic probes.           | SLO burn ≥ 10%/hour triggers autonomy demotion; ≥25%/hour triggers stop.   |
| Stability / Oscillation        | Rapid tier changes or conflicting actions that create control-plane churn (flapping), deadlocks, or resource thrash.                                                              | Orchestrator timelines, arbitration decisions, retry logs, reconciliation loops.                  | Oscillation index > 0.6 for 10 minutes triggers human review.              |
| Reputational / Regulatory Risk | Communications, disclosures, or customer-visible actions that could impact trust or compliance standing.                                                                          | Communication approvals, content classifiers, compliance attestations, audit checkpoints.         | Requires explicit delegation; defaults to Tier 0 (manual) unless approved. |

## 2. Standard Metrics (with formulas and evidence expectations)

### 2.1 Actions by Tier

- **Definition:** Count of autonomous actions executed per autonomy tier (Tier 0 manual, Tier 1 assist, Tier 2 constrained autonomy, Tier 3 adaptive autonomy).
- **Formula:** `actions_by_tier[tier] = count(actions where executed_tier == tier and status == "completed" within period)`.
- **Evidence:** Immutable action receipts with tier, policy decision ID, and operator identity.
- **Board readout:** Display as stacked bar for period with % of total; footnote freshness.

### 2.2 Promotions / Demotions

- **Definition:** Number of tier escalations or downgrades initiated by policy gates or humans.
- **Formula:**
  - `promotions = count(state_transitions where from_tier < to_tier)`
  - `demotions = count(state_transitions where from_tier > to_tier)`
- **Evidence:** Orchestrator state machine logs with trigger reason (policy, SLO burn, budget cap, manual override).
- **Board readout:** Paired trend lines; annotate top three triggers.

### 2.3 Kill-Switch Activations

- **Definition:** Automatic or manual invocations of the autonomy kill-switch (full pause) with outcome.
- **Formula:** `kill_switch = count(events where control == "kill" and action in {armed, executed})` with `mean_time_to_pause`.
- **Evidence:** Kill-switch ledger entries, execution timestamps, reconciliation status, rollback confirmation.
- **Board readout:** Table with initiator, reason, scope, pause duration, and verification proof.

### 2.4 Near-Misses (Prevented Actions)

- **Definition:** Actions blocked by controls before execution that would have breached policy, cost, or SLO guardrails.
- **Formula:** `near_miss = count(actions where policy_decision == "deny" or risk_score >= threshold and outcome == "blocked")`.
- **Evidence:** Policy evaluation traces, simulation counterfactuals, pre-commit safety checks.
- **Board readout:** Bubble chart by category and potential impact; include “what would have happened” summary.

### 2.5 Value Delivered vs. Exposure

- **Definition:** Net benefit of autonomous actions relative to risk exposure taken.
- **Formula:** `(savings + revenue_uplift + toil_reduction_value) - (risk_reserve + mitigation_cost)`; expressed with confidence intervals.
- **Evidence:** Cost guard estimates, A/B holdouts, toil time tracking, incident postmortems.
- **Board readout:** Single KPI with range; annotate top value drivers and reserves held.

### 2.6 Counterfactual Outcome (No-Autonomy Baseline)

- **Definition:** Estimated outcome had the system operated one tier lower (or manual) during the same window.
- **Method:** Replay with simulation engine using identical inputs but reduced autonomy; compute delta on value and risk.
- **Evidence:** Simulation run IDs, parameter set, reproducible seeds, and variance analysis.
- **Board readout:** “Autonomy lift” card showing benefit and avoided risk.

## 3. Risk Scoring & Thresholds

- **Risk Score (0-100):** Weighted composite of category scores (default weights: Safety 35, SLA 25, Cost 20, Stability 10, Reputation 10).
- **Tolerance Bands:**
  - Green: ≤30, Yellow: 31-60, Red: >60.
  - Board alert when Red persists >24h or any Safety event is non-green.
- **Escalation:** Automatic demotion one tier when Red; kill-switch armed if Safety sub-score >70.

## 4. Evidence & Provenance Requirements

- Every metric must link to an immutable action receipt with: `who`, `what`, `when`, `tier`, `policy_decision_id`, `control_applied`, `simulation_reference` (if counterfactual used).
- Evidence index entries must be time-bounded (monthly/quarterly) and exportable to the external assurance packet.

## 5. Reporting Cadence

- **Monthly (Board packet):** Actions by tier, risk score trend, value vs. exposure, top near-misses, control effectiveness highlights.
- **Quarterly (Regulator-ready):** Full taxonomy coverage plus counterfactuals, kill-switch drills, and delegated approvals log.
