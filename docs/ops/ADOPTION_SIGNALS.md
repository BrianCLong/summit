# Adoption Signals (Privacy-Respecting)

Purpose: measure onboarding success without collecting content or personal data. All signals must be aggregated and tenant-bound.

## Core Metrics

- **Time to first success:** Duration from service account issuance to first `status=accepted` agent run.
- **Policy denials during onboarding:** Count of `policy_decisions[].verdict = deny` in the first 24 hours.
- **Cost cap hits:** Count of runs blocked because `cost_cap_cents` or tenant budget would be exceeded.

## Collection

- Emit metrics via provenance exports only; do not scrape prompts or outputs.
- Aggregate by tenant and partner ID; never store user-level identifiers.
- Retain onboarding metrics for 30 days for tuning; purge afterwards unless required by audit.

## Dashboards / Queries

- `analytics/adoption` endpoint (read-only) exposes the three core metrics.
- Suggested PromQL (example):
  - `sum by (tenant) (onboarding_policy_denials_total)`
  - `sum by (tenant) (onboarding_cost_cap_hits_total)`
  - `avg_over_time(time_to_first_success_seconds[7d])`

## Feedback Loop

- Flag tenants with: time-to-first-success > 20 minutes, or >3 denials, or any cost-cap hit.
- Open a documentation issue when recurring denials share the same policy ID.
- Tighten quickstart defaults (budget, RPS, scopes) when cost-cap hits spike.
