# Operating Cadence

This cadence makes day-to-day operations systematic and predictable. Every ritual is time-boxed,
produces explicit artifacts, and routes actions into the improvement backlog for traceability.

## Scope & Principles

- **Systematic, not heroic:** Every review has pre-reads, owners, and evidence requirements.
- **Closed loop:** Decisions must be converted into backlog items with verification steps.
- **Evidence-first:** Every action references a measurable metric or artifact.
- **Golden-path safe:** Changes must be reversible and regression-locked where appropriate.

## Cadence Overview

| Cadence   | Ritual              | Duration | Owner                   | Primary Outputs                                           |
| --------- | ------------------- | -------- | ----------------------- | --------------------------------------------------------- |
| Weekly    | Ops Review          | 45 min   | Ops Lead                | Action items, risk register updates, linked evidence      |
| Monthly   | Risk Review         | 60 min   | Ops Lead + Exec Sponsor | Control tuning, escalations, backlog priorities           |
| Quarterly | Optimization Review | 90 min   | Exec Sponsor            | QoQ objectives, budget/threshold shifts, regression locks |

## Weekly Ops Review

- **Purpose:** Detect reliability/cost/security drift early and trigger fast corrections.
- **Participants:** Ops lead (chair), SRE DRI, SecOps DRI, FinOps DRI, Product counterpart.
- **Inputs:** Last 7 days of SLO burn rates, incident timeline, cost deltas vs budget, security events, autonomy actions.
- **Outputs:**
  - Updated risk register entries and owner assignments.
  - Action items with due dates and verification steps.
  - Tickets created or linked in the improvement backlog.

### Weekly Agenda Template (45 minutes)

1. **SLO & reliability signals (10 min):** Latency/error creep, failover anomalies, regression locks triggered.
2. **Cost deltas (10 min):** Budget variance by tenant/capability/plugin, cache hit rates, prompt costs.
3. **Security events (10 min):** Dependency findings, access anomalies, secret rotation status.
4. **Autonomy actions (5 min):** Auto-demotions, kill-switch activations, advisory-only events.
5. **Actions & owners (10 min):** Assign remediation tasks, define verification tests, schedule follow-up.

### Pre-Read Checklist

- SLO dashboards updated with 7-day and 28-day baselines.
- Cost reports include per-tenant/capability deltas and variance triggers.
- Security findings triaged with severity and ownership.
- Autonomy health KPIs updated with any demotions or freezes.

### Post-Meeting Requirements

- Publish notes and decisions within 24 hours.
- Create backlog items with owners and verification steps.
- Capture evidence links (dashboards, incident reports, test outputs).

## Monthly Risk Review

- **Purpose:** Validate control effectiveness and forecast risk/cost posture.
- **Participants:** CTO/CISO sponsors, Ops lead, SecOps, FinOps, QA, selected service owners.
- **Inputs:** SLA/SLO trendlines, budget burn vs forecast, near-miss analyses, control performance metrics.
- **Outputs:**
  - Control tuning decisions (tighten/loosen thresholds) with rationale.
  - Escalations to quarterly optimization focus areas.
  - Refreshed risk register entries with likelihood/impact.

### Monthly Agenda Template (60 minutes)

1. SLA/SLO trends and exceptions.
2. Budget burn vs forecast, savings attribution confidence bands.
3. Near-miss and incident postmortem synthesis; regression locks coverage.
4. Control effectiveness review (security, reliability, cost governance).
5. Prioritized improvement backlog updates and owners.

### Evidence Expectations

- Month-over-month trend charts for cost, reliability, and security.
- Control coverage summary (policy-as-code checks, regression locks, audits).
- Updated risk register snapshots with changes annotated.

## Quarterly Optimization Review

- **Purpose:** Confirm quarter-over-quarter improvements and set the next tuning plan.
- **Participants:** Executive sponsors, Ops/SRE leads, FinOps, SecOps, Product, Data/ML reps.
- **Inputs:** QoQ trend summaries (cost, reliability, security), experiment results, regression lock efficacy.
- **Outputs:**
  - Optimization objectives and success measures for the next quarter.
  - Approved regression locks to keep gains durable.
  - Funding/priority adjustments for improvement backlog items.

### Quarterly Agenda Template (90 minutes)

1. What improved (QoQ deltas, wins held by regression locks).
2. What regressed (drift causes, blocked items, technical debt hotspots).
3. Tuning decisions (threshold updates, budget reallocations, cache/prompt changes).
4. Commitments for next quarter and evidence plan.

## Artifact Storage & Traceability

- **Ops notes:** Store in `ops/operations/weekly/YYYY-WW/` with minutes and action list.
- **Evidence links:** Record dashboards, incident IDs, and test outputs in meeting notes.
- **Backlog updates:** Ensure all action items map to `docs/operations/IMPROVEMENT_BACKLOG.md` entries.

## Cadence Execution Rules

- Every action must include a verification step (test, check, or dashboard) to close.
- Cadence health is measured by closure rate of action items and absence of repeated issues.
- Any skipped cadence must be documented with rationale and recovery plan.
