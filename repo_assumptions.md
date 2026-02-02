# repo_assumptions.md

## Verified

- Repository contents inspected locally; subsumption bundles and verifier script exist.
- CI uses GitHub Actions workflows under `.github/workflows/`.
- Evidence schemas and index live under `evidence/`.
- `api/` directory contains a Python FastAPI service (`main.py`, `Dockerfile`).
- `server/` directory contains a Node.js Express/GraphQL service.
- `api/` uses `spacy` and `sentence-transformers` for ML tasks.
- `api/` currently uses simple API Key authentication (`X-API-Key`).
- `docs/ci/REQUIRED_CHECKS_POLICY.yml` exists.

## Assumed (validate ASAP)

- `api/` service is intended to host the FactGov module.
- `api/` service can be integrated into the broader system (e.g. via API Gateway or direct calls).
- Python 3.11+ is the target version (based on `api/Dockerfile` check).
- Required status check names remain to be confirmed against branch protection.
- Summit prefers deterministic evidence: separate report/metrics/stamp artifacts.

## Must-not-touch (until validated)

- Public API surfaces in `packages/**` (no breaking changes).
- Existing GA gates / branch protection requirements.
- Deployment configs / secrets / infra definitions.
- `api/main.py` existing endpoints (wargame simulation) should be preserved.

## Validation plan

- Enumerate required checks via GitHub branch protection UI/API.
- Confirm test runner (pytest for api, jest for server).
