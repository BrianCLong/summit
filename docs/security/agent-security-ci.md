# Agent Security Evaluation CI Gate

This workflow enforces build-layer safety by running the agent security harness and scenario coverage checks on every pull request and push to `main`/`develop`.

## What Runs

1. Repository smoke tests (`pnpm test`).
2. Security evaluation harness (`pnpm security:eval --json`).
3. Coverage enforcement: ≥3 scenarios per category and strict-mode subset validated.
4. JSON results and junit artifacts uploaded for evidence.

## Local Workflow

- Install dependencies: `pnpm install`
- Run full suite: `pnpm security:eval`
- Filter by category: `pnpm security:eval --category prompt-injection`
- Strict subset only: `pnpm security:eval --strict-only`
- Machine-readable output: `pnpm security:eval --json > security-eval-results.json`

## Failure Interpretation

- **Exit code 1**: Scenario or coverage failure; review findings emitted per scenario.
- **Exit code 2**: Harness/validation error (e.g., malformed YAML or missing files).
- Findings include severity, category, and remediation hints to aid triage.

## Artifacts

- Harness emits structured JSON for CI; workflow stores it as `agent-security-evals.json`.
- Future provenance linkage can reference these artifacts for audits and regression tracking.
