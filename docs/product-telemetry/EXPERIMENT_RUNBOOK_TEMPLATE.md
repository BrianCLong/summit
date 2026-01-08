# Experiment Runbook Template

## 1. Overview

- **Name & ID**: `<experiment_name>` / `<experiment_id>`
- **Owner**: `<team>` — DRI + reviewer
- **Feature area & workflow**: `<feature_area>` / `<workflow_name>`
- **Hypothesis**: "If we <change>, then <impact> as measured by <metric> will improve by <MDE>%"
- **Experiment type**: A/B/n | multivariate | phased rollout | interleaving
- **Start/End dates**: `<planned_start>` – `<planned_end>`

## 2. Success metrics

- **Primary**: `<metric_name>` (definition, unit, directionality, data source)
- **Secondary**: `<metric_name>` (behavioral/leading indicators)
- **Guardrails**: latency p95, error_rate, abandonment, ticket volume, compliance flags
- **Minimum detectable effect (MDE)** and **power** assumptions
- **Sample size**: calculated with baseline rates and MDE; include per-stratum counts if stratified

## 3. Eligibility & bucketing

- **Population**: roles, regions, tenant cohorts; exclusion criteria (e.g., restricted tenants)
- **Assignment**: hash `(tenant_id, user_id)` in namespace `<namespace>`; bucket weights and overrides
- **Sticky bucketing**: ensured via experiment SDK; persisted in `experiment_assignments`
- **Holdbacks**: % of traffic reserved for long-term controls if needed

## 4. Instrumentation checklist

- Event schemas registered and validated (include links)
- Feature flag configured (name, default state, kill switch path)
- Experiment exposure event emitted with bucket
- Outcome/guardrail events mapped to dashboards
- QA plan for client + server instrumentation; shadow events in pre-prod

## 5. Rollout plan

- **Phases**: 5–10% canary → 25% → 50% → 100%
- **Stop/rollback criteria**: guardrail breaches, significant negative lift, data quality issues
- **Comms**: release notes, on-call schedule, stakeholder updates cadence
- **Dependencies**: upstream services, migrations, cache warms, docs

## 6. Analysis plan

- Method: Bayesian/sequential | fixed-horizon; CUPED if applicable
- Segments to slice: role, region, tenant size, device
- Multiple testing controls (e.g., Holm-Bonferroni or hierarchical models)
- Data quality checks: event volume parity, missingness, schema violations
- Visualization: funnel, retention, lift with CIs, guardrail trends

## 7. Execution log

- Milestones and timestamps (launch, phase increases, incidents, fixes)
- Decisions taken and rationale (with links to dashboards)
- Issues encountered and mitigations

## 8. Final readout

- Outcome summary: lift, confidence, guardrail status
- Decision: ship, iterate, or rollback; feature flag final state
- Learnings: behavioral insights, follow-up hypotheses
- Next actions: tickets created, backlog items, follow-on experiments

## 9. Artifacts

- Links: dashboards, notebooks, schema PRs, rollout tickets, incident reports, recordings
- Data exports (if any) with retention and access controls
