# Wave 7 Orchestrator - Release Checklist & GA Readiness

## Continuous Integration Gates
- [ ] **Unit Tests:** `test:selfflow` passing on all modules.
- [ ] **E2E/Smoke Tests:** `make smoke` passing in staging.
- [ ] **Dependency Scans:** Dependabot / vulnerability checks clean.
- [ ] **Build Check:** NextJS apps and Python backends build without errors.
- [ ] **Evidence Gen:** `scripts/ai/run_ai_evals.mjs` generates valid artifacts.

## Merge Queue Rules
- [ ] Must be verified by CI pipelines (`ci-core`, `ci-selfflow`).
- [ ] Require 1 approving reviewer.
- [ ] Commit message must follow conventional commit standard.

## Rollback Steps
- [ ] **Auto-Rollback Criteria:** High error rates (>1%) or latency spikes (>500ms p99).
- [ ] **Rollback Trigger:** `AutoRollbackMonitor` automated process or `pnpm revert:latest`.
- [ ] **State Recovery:** Ensure Maestro run state is stable.
