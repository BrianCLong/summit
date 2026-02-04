# Dependency Audit Report - 2026-02-01

## Current State

### Python (api/ - FastAPI)
- **Web Framework**: FastAPI 0.128.*
- **Database**: SQLAlchemy 2.*, Neo4j (via `neo4j-driver`), asyncpg 0.31.*
- **Validation**: Pydantic 2.*
- **Other**: Redis, python-jose, passlib, httpx, jinja2.

### Node.js (server/ - Express)
- **Web Framework**: Express, Apollo Server (GraphQL)
- **Database**: PostgreSQL (pg), Neo4j (neo4j-driver)
- **Queues**: BullMQ
- **Feature Flags**: Flagsmith, LaunchDarkly

## Proposed Changes (Week 1)

### Python Additions
To support the multi-product architecture and shared services, the following packages are proposed:
1. **Alembic**: Essential for database migrations on the Python side.
2. **psycopg2-binary**: Often needed by Alembic for synchronous database operations during migrations.
3. **Stripe**: Required for the planned billing integration (Product API).
4. **Celery**: Proposed for background task orchestration (matching the platform's multi-product needs). *Note: Platform currently uses BullMQ for Node.js; Celery will be the Python equivalent.*
5. **Redis**: (Already exists in `requirements.in`).

### Risks
- **Dual Queue Systems**: Running both BullMQ and Celery may increase operational complexity. We should evaluate if Celery can eventually replace or interoperate with BullMQ.
- **Dependency Bloat**: Adding Stripe and Celery early might increase container size. We will keep them optional or behind feature flags where possible.
- **Billing Provider Lock-in**: Stripe is the primary candidate, but we will maintain a provider-agnostic interface in the code.

## Action Plan
- Add `alembic`, `psycopg2-binary`, `stripe`, and `celery` to `requirements.in`.
- Run `pip-compile` (if applicable) or update lockfiles.
- Initialize Alembic in the `api/` directory.
