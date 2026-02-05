# Repo Reality Check: Summit Platform

## Verified (Surface)
- Framework: FastAPI (Python 3.12)
- Entrypoint: `api/main.py`
- Tests: `pytest`
- Dependencies: `requirements.in` (managed via pip-compile or similar)
- Migrations: Handled via `alembic` (referenced in requirements)

## Assumed (Verified via code)
- Routing: Mounted in `api/main.py` using `app.include_router`
- Environment: Docker Compose for dev (Neo4j, Redis, Postgres)
- CI: GitHub Actions with strict policy gates
