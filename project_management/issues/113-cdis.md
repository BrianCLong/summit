# 113: Causal Discovery & Intervention Simulator (CDIS)

Track: Feature Flags
Branch: feat/cdis
Labels: feature-flag, area:analytics, area:causal, ci:e2e

## Summary
Discover candidate causal DAGs from time-stamped graph signals, support do-calculus simulation, and expose counterfactual analyses behind CDIS_ENABLED. Provide APIs and a UI lab for discover → intervene → explain flows using read-only, snapshot-pinned dependencies.

## Deliverables
- Python 3.12 service at `/ai/cdis` with structure learners: NOTEARS, PC, Granger variants.
- Do-calculus simulator with counterfactual delta on risk and path outcomes, including top-k path contribution explanations.
- APIs: POST `/discover`, POST `/intervene`, GET `/explain/:simId` returning graph, effects, confidence, and contributing paths.
- "Causal Lab" UI with toggleable interventions, effect size bars, and jQuery sliders for intervention strength.

## Constraints
- Read-only execution; snapshot-pinned dependencies; no biometric features.
- Expose functionality only when `CDIS_ENABLED` is true.

## DoD / CI Gates
- Gold synthetic DAG fixtures with known ground truth; estimated effects within tolerance thresholds.
- Playwright E2E: discover → intervene → share flow.
- Unit/contract tests for learners, do-calculus, and API contracts.

## Open Questions (Tuning)
- Preferred learner priority (PC vs. NOTEARS)?
- Max variable count per run for v1?

## Parallelization Notes
- Analytics-only; emits advisories; no shared stores with other features.
