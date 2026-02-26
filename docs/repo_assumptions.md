# Repo Assumptions vs Reality

## Assumed Structure (from Prompt)
- summit/
  - benchmarks/
  - models/
  - evals/
  - evidence/
  - scripts/

## Reality
- No `summit/` root directory.
- `services/` contains microservices (`model-hub-service`, `evals`, `ml-serving`).
- `services/model-hub-service` is a TypeScript registry/router.
- `services/evals` is a minimal TypeScript service.
- `services/ml-serving` is a minimal Python FastAPI service.
- No existing Python-based benchmark harness found in root.

## Plan
- Create `models/` directory in root to house Python-based model adapters as requested.
- Create `benchmarks/` directory for profiles.
- Create `scripts/` for the benchmark runner and governance checks.
- Create `evidence/` for output artifacts.
- Use Python for the benchmark runner as implied by the file extensions in the prompt (`.py`).
