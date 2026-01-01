# Runbook: Local Stack Bootstrap

## Context

Use this runbook to bring up the Summit stack on a fresh workstation or CI runner. It mirrors the golden path (`make bootstrap && make up && make smoke`) and is the fastest way to validate that the Investigation → Entities → Relationships → Copilot → Results flow is healthy.

## Preconditions

- Docker Desktop ≥ 4.x with 8 GB memory and BuildKit enabled.
- Node 18+ with `corepack enable` (pnpm 9) available on PATH.
- Ports 3000, 4000, 5432, 6379, 7474, 7687, and 8080 free.
- `.env` present (created automatically by `make bootstrap` if missing).

## Steps

1. **Clone and enter the repo**
   ```bash
   git clone https://github.com/BrianCLong/summit.git
   cd summit
   ```
2. **Install dependencies and seed env**
   ```bash
   make bootstrap
   ```

   - Seeds `.env` from `.env.example` if absent.
   - Installs pnpm workspace packages and Python tooling.
3. **Start core services**
   ```bash
   make up
   ```

   - Launches API, UI, Postgres, Neo4j, Redis, and observability via `docker-compose.dev.yml`.
   - Waits for health/readiness via `scripts/wait-for-stack.sh`.
4. **Optional AI/Kafka profile**
   ```bash
   make up-ai
   ```

   - Adds Kafka + ai-worker stack defined in `docker-compose.ai.yml`.
5. **Run golden path smoke test**
   ```bash
   make smoke
   ```

   - Executes the same dataset-driven flow as CI using `scripts/smoke-test.js`.
6. **Access the UI**
   - Frontend: http://localhost:3000
   - GraphQL: http://localhost:4000/graphql

## Verification

- `make smoke` exits 0 and reports success.
- Health probes respond: `curl -sf http://localhost:4000/health`.
- UI loads without console errors; Investigation creation works using the seeded dataset.

## Common failures & fixes

- **Ports already in use**: Stop other compose stacks or update port bindings in `docker-compose.dev.yml` before rerunning `make up`.
- **pnpm/corepack missing**: Run `corepack enable` (Node 18+) or install pnpm 9 manually, then re-run `make bootstrap`.
- **Compose services crash**: Check logs with `docker compose -f docker-compose.dev.yml logs -f api` (or service name), fix env values, and rerun `make up`.
- **Smoke test flakiness**: Ensure `make up` completed and DBs are ready; rerun `make smoke` after `make down && make up` to reset state.

## Notes

- `./start.sh [--ai]` wraps steps 2–5 and should remain green before any code changes.
- Use `make down` when finished to clean up containers and networks.
