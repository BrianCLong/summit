# Policy Simulation Thresholds

The recommendation engine applies explicit guardrails to decide whether a proposed policy can be merged.

## Default thresholds

- **Must-pass scenario IDs**: `ANALYTICS-001`, `ANALYTICS-002` (cross-tenant isolation and PII enforcement).
- **Max false-positive delta**: `0.05` (more than 5% new denials triggers reject).
- **Max outcome flips before review**: `3` (above this, mark `needs_review`).

## Tunable fields

Update via `RecommendationEngine` overrides (see `server/src/policy/simulation/recommendationEngine.ts`):

- `mustPassScenarioIds` — list of scenario IDs that must not regress.
- `maxFalsePositiveDelta` — acceptable newly-denied benign cases.
- `maxOutcomeFlipsBeforeReview` — sensitivity to widespread changes.

## Decision mapping

- **Reject**: any must-pass regression or false-positive rate above threshold.
- **Needs review**: outcome flips exceed tolerance while must-pass holds.
- **Approve**: must-pass respected, security-positive signals present, false-positive rate within limits.

## Safety defaults

- No production bundles are mutated; proposals are applied in-memory overlays.
- All evaluations are deterministic fixtures; no network or external model calls.
