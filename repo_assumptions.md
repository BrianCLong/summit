# repo_assumptions.md

## Verified

- **Dual API Surfaces**:
  - **Node.js (Primary Backend)**: Located in `server/`, uses Express + GraphQL.
  - **Python (AI/ML Backend)**: Located in `api/`, uses **FastAPI**.
- **Package Manager**: **pnpm** for Node.js, `requirements.in` for Python.
- **Python Entrypoint**: `api/main.py` is the main entry point for the FastAPI application.
- **Routing**: Python routes are currently in `api/main.py` or included via `app.include_router`.
- **Migrations**: Prisma, Knex, and custom Neo4j migrations exist for the Node.js side. Alembic is mentioned in `requirements.in` but not fully configured for `api/`.
- **Docs**: `README.md` and `docs/` exist. `docs/ARCHITECTURE.md` currently focuses on the Node.js backend.

## Assumed (validate ASAP)

- **Alembic**: Not yet configured in `api/` directory (no `alembic.ini` found in `api/`).
- **Feature Flags**: No central feature flag system found in `api/` yet. `feature_flags/flags.yml` exists but has limited flags.
- **CI Required Checks**: Branch protection names to be confirmed.

## Must-not-touch (until validated)

- `.github/workflows/*` (except as part of deterministic artifacts gate if needed).
- `docs/ci/REQUIRED_CHECKS_POLICY.yml` (if exists).
- `SECURITY/` contents (except additive).

## Validation plan

- Confirm if `api/main.py` is the intended target for the "Multi-product architecture". (User prompt implies FastAPI, so yes).
- Search for existing SQLAlchemy models in `api/` to see if they are ready for Alembic.
