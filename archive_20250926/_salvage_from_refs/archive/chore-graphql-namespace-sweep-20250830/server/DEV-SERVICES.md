# Local Services (Neo4j • Redis • Python NER) with Docker Compose

This guide shows how to run a local “services” stack for Neo4j, Redis, and a placeholder ML API, wire env vars, and run tests that need real services.

## Prereqs

- Docker (Compose v2)
- Node 20 + pnpm 9
- (Optional) k6 for smoke tests

## 1) Start the services

```bash
docker compose -f server/compose.services.yml up -d
# wait for healthchecks
docker compose -f server/compose.services.yml ps
```

Services exposed (defaults; adjust if you edited the compose file):

- Neo4j: `bolt://localhost:7687` (browser at http://localhost:7474)
- Redis: `redis://localhost:6379`
- Python NER API (placeholder): `http://localhost:8081`

> Note: The ML service in the compose is a simple placeholder (http echo). Swap with your actual ML container when available.

## 2) Environment variables (local dev)

Create a `.env.local` in the repo root (or export in your shell):

```dotenv
# --- Server (API) ---
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=devpassword

REDIS_URL=redis://localhost:6379
PYTHON_API_URL=http://localhost:8081

# Optional: audit DB (disable or point to your local PG if used)
# DATABASE_URL=postgres://user:pass@localhost:5432/intelgraph

# Auth (only if your local server enforces JWT)
# JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
# (Use a dev token in Authorization: Bearer <token> or disable auth in local config)

# --- Client (web) ---
VITE_API_BASE=http://localhost:8080
VITE_ASSISTANT_TRANSPORT=fetch
```

Tip: If you don’t need JWT locally, ensure your local config runs the assistant routes without required auth (or use a dev keypair + token).

## 3) Run the server & client locally

```bash
# server API
pnpm --filter server dev   # or: pnpm --filter server start

# client app (in another terminal)
pnpm --filter client dev   # or: pnpm --filter client preview
```

## 4) Run tests with services enabled

Unit/mocked tests (fast, CI-friendly):

```bash
pnpm run test:all
```

Integration with real services (Neo4j/Python/ffmpeg):

```bash
WITH_SERVICES=1 pnpm --filter server jest --ci --runInBand --coverage
```

AI-Enhanced streaming fuzz (only on capable runners):

```bash
WITH_ASSISTANT=1 pnpm --filter client jest --config client/jest.config.cjs --ci --runInBand
```

Playwright smoke (requires a port-capable runner):

```bash
pnpm --filter client playwright test --project=chromium --grep @smoke
# if you already have the app running: set reuseExistingServer in playwright.config
```

k6 smoke (optional):

```bash
k6 run server/tests/k6.assistant.js -e BASE=http://localhost:8080 -e TOKEN=$DEV_JWT
```

## 5) Stop & clean

```bash
docker compose -f server/compose.services.yml down
# or to wipe volumes:
docker compose -f server/compose.services.yml down -v
```

## 6) Troubleshooting

- Client tests pick up AI-Enhanced suites: ensure `WITH_ASSISTANT=0` (default).
- Playwright can’t bind a port: run on a port-capable host or configure `reuseExistingServer`.
- Server tests can’t see services: verify env vars (`NEO4J_*`, `REDIS_URL`, `PYTHON_API_URL`) and `docker compose ... ps` health states.
- JWT auth errors locally: either supply a dev token & `JWT_PUBLIC_KEY`, or disable required auth in your local server config.

