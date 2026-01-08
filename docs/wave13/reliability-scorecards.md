# Reliability Scorecards & Tiering

## Tier Rubric

- **Tier 0**: hard real-time/security-critical (authz, provenance). Requirements: 99.95% SLO, paging 24/7, chaos monthly, DR Tier 0 targets.
- **Tier 1**: user-facing core (search, ingest). Requirements: 99.9% SLO, paging business hours + weekends, chaos quarterly, DR Tier 1 targets.
- **Tier 2**: analytics/UX. Requirements: 99.5% SLO, best-effort paging, chaos semi-annual.

## Scorecard Inputs

- SLO burn rate (last 28d)
- MTTR (median & p90)
- Change fail rate (CFR)
- Deployment frequency
- Flake count for critical tests

## Generator

- Collects metrics from Prometheus + incident tracker; outputs CSV and Markdown per service.
- Example command: `pnpm --filter @intelgraph/ops scorecard --service search --month 2025-09`.

## Sample Output (Markdown)

```
Service: search-api (Tier 1)
SLO: 99.9% (Actual 99.93%)
Error Budget Burn: 40% (status: healthy)
MTTR: 22m (target <30m)
CFR: 5% (target <10%)
Deployment Frequency: 18/mo
Flake Count (critical suites): 1 (quarantined)
Actions: tighten canary to 15% for next 2 releases; add alert on 400ms p95 regression.
```

## Error Budget Policy

- Burn rate >2x target for 48h: **release freeze** until budget <50% consumed.
- Burn rate 1–2x: **canary-only** deployments with SRE approval.
- Burn rate <1x: normal deployments.

## Review Cadence

- Monthly scorecard review in Reliability WG; action items tracked to completion.
