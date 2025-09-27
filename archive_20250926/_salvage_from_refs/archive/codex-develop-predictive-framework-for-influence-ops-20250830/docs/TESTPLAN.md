# Test Plan

## Core GA
- **Acceptance Tests**
  - API endpoints validated with golden I/O.
  - UI smoke tests: tri-pane loads, command palette opens, brush/zoom works.
- **CI Gates**
  - `npm test` with coverage ≥80%.
  - Golden dataset tests run in CI.

## Prov-Ledger Beta
- **Acceptance Tests**
  - Import→tag evidence→export→verify happy path.
  - Verifier recomputes hashes and validates transform chain.
- **CI Gates**
  - Ledger verifier stub executed in pipeline.

## Predictive Alpha
- **Acceptance Tests**
  - Forecast and counterfactual APIs return confidence bands.
- **CI Gates**
  - Model training checks and regression tests.

## Connectors v1
- **Acceptance Tests**
  - Sample datasets for each connector.
  - Rate-limits enforced; mapping manifests validated.
- **CI Gates**
  - Golden I/O tests per connector run in CI.

## Ops Hardening
- **Acceptance Tests**
  - SLO dashboards show latency, error, saturation.
  - Chaos drill plan approved.
- **CI Gates**
  - Lint, unit, integration tests; policy checks and risk burn-down.
