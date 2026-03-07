# 0021 - Reliability Scorecard Weights & Rationale

## Status

Accepted

## Context

Services span multiple criticality levels. We need consistent weighting of SLOs, MTTR, change fail rate, and flakiness to produce actionable scorecards and enforce error budget policies.

## Decision

- Tier rubric defines controls per Tier0/1/2; weights per metric: SLO (40%), MTTR (20%), CFR (15%), Deploy frequency (15%), Flake count (10%).
- Monthly generator computes composite score; actions triggered when score <80 or error budget burn >2x.
- Error budget policy: freeze releases when burn rate exceeds 2x for 48h; canary-only when 1–2x; normal otherwise.

## Alternatives Considered

1. **Unweighted checklist**: lacks prioritization; rejected.
2. **Pure SLO-only scoring**: ignores operational excellence and release health; rejected.

## Consequences

- - Clear, comparable scores across services; + enforces release discipline tied to budgets.
- - Requires telemetry quality and regular review meetings.

## Validation

- Two pilot services (search-api, ingest-worker) scored monthly with action items captured in Reliability WG minutes.

## References

- `docs/wave13/reliability-scorecards.md`
