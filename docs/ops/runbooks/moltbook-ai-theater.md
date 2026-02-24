# Runbook: Moltbook AI-Theater Evaluation Pack

## Purpose
Operate the fixture-only agentic-platform evaluation pack and interpret deterministic failures.

## Preconditions
* Feature flag `SUMMIT_AGENTIC_PLATFORM_EVAL=1` (fixtures-only in CI).
* Fixtures stored in `fixtures/moltbook_ai_theater/`.

## Run Locally (Fixture-Only)
1. Build the CLI (`pnpm --filter @intelgraph/cli build`).
2. Run the evaluation command once the profile is registered (`summit eval agentic-platform --fixture moltbook-classic`).
3. Confirm artifacts exist at `artifacts/moltbook-ai-theater/`.

## Expected Artifacts
* `report.json` (findings and claim mapping)
* `metrics.json` (counts, severities, budgets)
* `stamp.json` (profile + fixture hash + git commit)

## Failure Interpretation
* **Secrets gate**: API keys found in client/public bundle.
* **Write gate**: unauthenticated write path detected.
* **PII gate**: synthetic PII fields exposed.
* **Provenance gate**: AI-only claim without provenance signals.

## Add a New Fixture Safely
1. Create a synthetic fixture JSON with no real secrets/PII.
2. Document intent in `fixtures/moltbook_ai_theater/README.md`.
3. Update expected artifact assertions (if present) without adding timestamps.

## Alerting
CI failure is the alert. No runtime pager is used for fixture-only packs.
