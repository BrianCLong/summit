# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project scope

- Polyglot monorepo for the IntelGraph platform. Primary code is Node/TypeScript (client, server, gateway, apps) with Python services (ML, ingest, ER) and some Go tooling.
- Development flows are package-scoped (no single root package.json for everything). Use per-package scripts below.
- Top-level Makefiles focus on ops (stabilization, DB helpers, deployment), while day-to-day dev uses package-local scripts.

Prereqs and versions

- Node: 20.x (see .nvmrc)
- Python: service-specific (e.g., ML uses 3.12). Use each service’s pyproject/requirements.
- Docker + Docker Compose for local stacks, integration tests, and CI parity.

Common commands

Golden path local stack

- Quickstart (from README)
  ```bash path=null start=null
  make bootstrap
  make up
  make smoke
  ```
- Optional services
  ```bash path=null start=null
  make up-ai
  make up-kafka
  make up-full
  ```
- Fallback (deployment scaffold)
  ```bash path=null start=null
  make -C deploy up
  make -C deploy smoke
  ```

Justfile (Conductor stack)

- Boot/stop/status
  ```bash path=null start=null
  just conductor-up
  just conductor-status
  just conductor-down
  ```
- Smoke and drills
  ```bash path=null start=null
  just conductor-smoke
  just conductor-drill
  ```

Node/TypeScript

- Server (GraphQL API)
  - Install
    ```bash path=null start=null
    npm ci --prefix server
    ```
  - Dev
    ```bash path=null start=null
    npm run dev --prefix server
    ```
  - Build/Typecheck
    ```bash path=null start=null
    npm run build --prefix server
    npm run typecheck --prefix server
    ```
  - Lint
    ```bash path=null start=null
    npm run lint --prefix server
    ```
  - Tests
    ```bash path=null start=null
    npm test --prefix server
    npm run test:watch --prefix server
    npm run test:coverage --prefix server
    ```
  - Single test
    ```bash path=null start=null
    npm test --prefix server -- src/path/to/file.spec.ts
    npm test --prefix server -- -t "partial test name"
    ```
  - Data tasks (typical)
    ```bash path=null start=null
    # migrations & seeds
    node server/scripts/db_migrate.cjs
    npm run seed --prefix server         # seed baseline data
    npm run seed:demo --prefix server    # demo dataset
    # persisted queries
    node server/scripts/generate-persisted-queries.mjs
    ```

- Client (React + Vite)
  - Install
    ```bash path=null start=null
    npm ci --prefix client
    ```
  - Dev/Build/Typecheck
    ```bash path=null start=null
    npm run dev --prefix client
    npm run build --prefix client
    npm run typecheck --prefix client
    ```
  - Lint
    ```bash path=null start=null
    npm run lint --prefix client
    ```
  - Tests (Jest + Vitest + Playwright)
    ```bash path=null start=null
    npm run test --prefix client
    npm run test:jest --prefix client
    npm run test:vitest --prefix client
    npm run test:e2e --prefix client
    npm run test:coverage --prefix client
    ```
  - Single test
    ```bash path=null start=null
    npx vitest --root client src/components/MyWidget.test.tsx
    npx vitest --root client -t "renders widget"
    npm run test:jest --prefix client -- src/components/MyWidget.test.tsx
    npm run test:jest --prefix client -- -t "renders widget"
    ```
  - Persisted operations
    ```bash path=null start=null
    npm run persist:queries --prefix client
    npm run generate:persisted --prefix client
    ```

- Gateway (Apollo Federation)

  ```bash path=null start=null
  npm ci --prefix gateway
  npm run dev --prefix gateway
  npm run build --prefix gateway
  npm test --prefix gateway
  ```

- Apps/web (Vite + Vitest + Storybook)
  - Dev/Build/Typecheck
    ```bash path=null start=null
    npm run dev --prefix apps/web
    npm run build --prefix apps/web
    npm run typecheck --prefix apps/web
    ```
  - Tests/Storybook
    ```bash path=null start=null
    npm test --prefix apps/web
    npm run storybook --prefix apps/web
    npm run build-storybook --prefix apps/web
    ```
  - Single test
    ```bash path=null start=null
    npx vitest --root apps/web src/**/*.test.tsx -t "name"
    ```

Aggregators and workspaces

- intelgraph/ (aggregator for server+client)
  ```bash path=null start=null
  npm run dev --prefix intelgraph            # runs server:dev + client:dev
  npm run test --prefix intelgraph           # server + client tests
  npm run build --prefix intelgraph
  ```
- intelgraph-mcp/ (pnpm workspace)
  ```bash path=null start=null
  pnpm -C intelgraph-mcp -w install
  pnpm -C intelgraph-mcp -w -r build
  pnpm -C intelgraph-mcp -w -r test
  ```

Python

- ML service (Poetry)
  ```bash path=null start=null
  cd ml && poetry install
  poetry run pytest
  poetry run pytest -k "pattern"   # single test selection
  ```
- Ingest service (setuptools; dev extras)
  ```bash path=null start=null
  cd services/ingest
  python -m venv .venv && source .venv/bin/activate
  pip install -e .[dev]
  ruff check . && mypy . && pytest -k "pattern"
  ```
- General pattern for other services (pyproject/requirements)
  ```bash path=null start=null
  # Poetry projects
  poetry install && poetry run pytest -k "pattern"
  # PEP 621 / setuptools projects
  python -m venv .venv && source .venv/bin/activate && pip install -e .[dev] && pytest -k "pattern"
  ```

Go tooling

- Run within module directories
  ```bash path=null start=null
  (cd libs/configguard/go && go build ./... && go test ./...)
  (cd tools/scba && go build ./... && go test ./...)
  ```

Databases and local env

- DB helpers
  ```bash path=null start=null
  make -f Makefile.db db/up
  make -f Makefile.db db/migrate
  ```
- Env bootstrap
  ```bash path=null start=null
  cp .env.example .env
  ```
- Health endpoints (typical)
  ```bash path=null start=null
  curl http://localhost:4000/health
  curl http://localhost:4000/metrics
  ```

E2E tests (central suite)

```bash path=null start=null
npm run test --prefix tests/e2e
npm run test:chromium --prefix tests/e2e
npm run report --prefix tests/e2e
```

Release/deploy

- Orchestrated via Makefile.release (staging then prod):
  ```bash path=null start=null
  make -f Makefile.release stage
  make -f Makefile.release prod
  ```

Repository rules surfaced to agents

- Copilot (.github/copilot-instructions.yml)
  - Triggers: /scaffold (suggest scaffolds/), /policy (reference policies/), /grafana (reference scaffolds/grafana-panel.json)
- Claude (.claude/settings.local.json)
  - Allows selected Bash actions (limited npm/make/git). Keep actions idempotent.

High-level architecture and structure

- Big picture
  - React web client (Vite) communicates with a Node/TypeScript GraphQL API (Apollo Server/Apollo v4).
  - Primary data stores: Neo4j (graph), PostgreSQL (relational + pgvector), Redis (cache/pub-sub), TimescaleDB (time-series in some setups).
  - Observability: OpenTelemetry instrumentation in server with Prometheus export; Grafana dashboards used in ops.
  - Supporting services: Federation Gateway, ingest pipelines, ER/ML Python services, plus domain packages in services/, apps/, packages/, libs/.

- Key directories (purpose)
  - server/: GraphQL API, resolvers, services, migrations, scripts, tests.
  - client/ and apps/web/: Frontends (Jest/Vitest/Storybook).
  - gateway/: Federation gateway.
  - intelgraph/: Aggregator for concurrent dev/test/build.
  - services/: Operational microservices (ingest, analytics, ER/ML, graph-core, etc.).
  - packages/ and libs/: Shared libraries (TS/Go), SDKs, tooling (e.g., configguard).
  - deploy/ and compose/ files: Docker Compose stacks for local dev and previews.
  - Makefile.release: Staging/production rollouts and SLO checks.

- Data flow (essentials)
  1. Client issues GraphQL queries/mutations to server.
  2. Middleware handles authN/Z, validation, rate limiting.
  3. Resolvers orchestrate Neo4j, PostgreSQL, Redis operations, with optional timeseries.
  4. Subscriptions/WebSockets stream updates back to clients.

Notes for future agents

- Use per-package npm scripts (use --prefix from repo root). Prefer pnpm only where a workspace exists (intelgraph-mcp).
- Single-test selection
  - Jest: npm test -- -- <path-or-pattern> and/or -t "name"
  - Vitest: npx vitest <path> -t "name"
  - Pytest: pytest -k "pattern"
- Persisted operations
  - Client: persist/generate scripts; Server: generate-persisted-queries.mjs
- Many subpackages include local README.md files—check them for service-specific details.
