# Causal Discovery & Intervention Service (CDIS)

CDIS provides a Python 3.12 FastAPI microservice for causal discovery, do-calculus simulation, and counterfactual explanation. Endpoints are guarded by the `CAUSAL_LAB_ENABLED` feature flag so the service can be deployed in read-only environments.

## Endpoints
- `POST /discover` — run structure learning (NOTEARS, PC, or Granger) against tabular or time-series payloads.
- `POST /intervene` — apply `do()` interventions on learned graphs, return effect deltas, confidence, and top-k path contributions.
- `GET /explain/{simId}` — fetch previously-computed simulation payloads (graph, effects, path-level decomposition).

## Getting started
```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export CAUSAL_LAB_ENABLED=true
uvicorn app:app --reload --port 8080
```

Visit `ui/index.html` for the “Causal Lab” dashboard (uses jQuery sliders for intervention strength and effect bars to visualize deltas). The UI expects the API to be available on `http://localhost:8080`.

## Tests
- Python unit tests: `pytest tests`
- Playwright E2E (from `e2e/`): `npm ci && npx playwright test`

## Security & compliance
- No biometric or PII processing; synthetic fixtures only.
- Dependencies are snapshot pinned via `requirements.txt` and pinned npm devDependencies for deterministic builds.
- The service is read-only; simulations are kept in-memory and never persisted to disk.
