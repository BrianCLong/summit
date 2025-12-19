# Agent Risk Scoring & Gates

Risk scoring governs when autonomous changes are allowed to merge. The scoring model is deterministic and based solely on repository state—no external billing or dynamic pricing inputs are used.

## Scoring model

| Signal | Score | Rationale |
| --- | --- | --- |
| Touches `server/src`, `client/src`, `infra/`, or `.github/workflows/` | +3 each | Core runtime, infra, and CI changes are high-impact. |
| Touches `schemas/` or `agents/budgets/` | +2 each | Governance artifacts directly affect validation. |
| Touches `agents/` code (non-budget) | +1 | Agent logic changes require caution. |
| Files changed > 30 | +4 | Large surface area increases blast radius. |
| Files changed > 15 (≤ 30) | +2 | Moderate surface area. |
| Files changed > 8 (≤ 15) | +1 | Small but non-trivial set of files. |
| Add/remove budget manifest | +2 | Budget drift impacts enforcement. |

Derived tiers:

- **Low**: score < 3
- **Medium**: 3 ≤ score < 6
- **High**: 6 ≤ score < 9
- **Critical**: score ≥ 9

## Enforcement rules

- PRs flagged **critical** or with score > 8 fail the gate.
- PRs flagged **high** must have manifests present and valid (the manifest check runs first).
- The gate runs before lint/tests to fail fast when governance constraints are violated.

## CI integration

`scripts/enforce-pr-risk.js` implements the scoring model and fails with a descriptive message when thresholds are exceeded. The script consumes `BASE_REF` and `HEAD_REF` (provided in CI) to diff the PR safely.

## Audit trail

Each enforcement run writes a JSONL record via `agents/audit/logStub.js` containing the score, tier, and whether the gate passed. This provides a deterministic telemetry feed for higher-level governance dashboards without external billing hooks.
