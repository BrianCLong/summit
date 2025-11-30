# Causal Discovery & Intervention Service (CDIS)

This service provides causal structure learning, do-calculus simulation, and counterfactual
analysis for the "Causal Lab" UI. It is implemented with **Python 3.12** and **FastAPI** and
ships with three structure learners (NOTEARS-style regression, PC conditional-independence, and
Granger time-series) plus a lightweight do-calculus simulator that can surface top-k path
contributions and counterfactual deltas.

## Features
- POST `/discover` — run causal discovery over tabular or time-series JSON data
- POST `/intervene` — apply `do()` interventions and compute counterfactual deltas
- GET `/explain/:simId` — retrieve learned graph, effect estimates, confidence, and top paths
- Feature-flagged via `CDIS_FEATURE_ENABLED=true`
- Synthetic DAG fixtures with tolerance-checked tests
- Playwright end-to-end flow that mirrors **discover → intervene → share**

## Getting started

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python -m playwright install --with-deps  # required for e2e browser automation
uvicorn cdis.api:app --reload --port 8090
```

Visit `http://localhost:8090/lab` for the Causal Lab UI. The API is read-only and uses in-memory
simulation state; no data is persisted, and no biometric inputs are accepted.

## Tests & lint

```bash
ruff check cdis
pytest -m "not e2e"
pytest -m e2e  # requires Playwright browsers and a running dev server on :8090
```

## CI
The `.github/workflows/cdis.yml` workflow installs Python 3.12, pins dependencies from
`requirements-dev.txt`, runs Ruff, unit tests, and the FastAPI contract tests. The Playwright e2e
suite is marked `e2e` and can be enabled with `RUN_E2E=true`.
