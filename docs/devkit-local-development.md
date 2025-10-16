# Dev Kit Local Development

The dev kit provides a one-command workflow for bootstrapping IntelGraph locally
with Docker Compose, deterministic seed data, observability wiring, and a
self-service smoke test. This guide walks through the quickest path to green,
explains the CLI surface area, and captures troubleshooting tips for the most
common issues.

## Prerequisites

- Docker Engine 24+ (Docker Desktop, Rancher Desktop, Colima, or native engine)
- Docker Compose V2 (`docker compose version`)
- Node.js 18+ (for optional local scripts) and pnpm if you plan to work outside
  containers
- 8 GB RAM available for containers
- Optional: `jq` for reading smoke test reports

Copy `.env.example` to `.env` and adjust values if you have custom ports or
credentials. The dev defaults expect no production credentials and rely on the
`DEV_TENANT_ID=tenant-dev` tenant for seeded data.

## Quick Start (≤10 minutes to green)

1. **Prime images (one-time)** – run `./dev up` to build/pull base images. The
   first invocation may take several minutes depending on your network, but
   subsequent runs reuse the cache.
2. **Bring the stack online** – run `./dev up` again (or wait for the first
   command to finish). After the images are cached, `docker compose` should
   reach healthy containers within ~60 seconds.
3. **Verify the environment** – execute `./dev test`. The CLI will seed
   PostgreSQL + Neo4j, run the synthetic "hello pipeline", and capture
   observability evidence in `runs/dev-smoke/latest.json`.
4. **Start hot reload (optional)** – `npm run dev` from the repo root attaches
   to the running containers and enables Vite/TS hot reload for the UI and API.
5. **Shut down** – `./dev down` tears down containers and persistent volumes.

Expected outputs:

- Successful smoke test completes in ≤60 seconds once containers are healthy.
- Jaeger UI: <http://localhost:16686>
- Prometheus metrics endpoint: <http://localhost:9464/metrics>
- GraphQL API: <http://localhost:4000/graphql>
- Vite client (when running `npm run dev`): <http://localhost:3000>

## CLI Reference

| Command               | Description                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `./dev up`            | Builds (if needed) and starts the dev Compose stack, waits for health checks, and runs deterministic database seeds.            |
| `./dev up --no-build` | Skips image builds; useful for tight inner loops once the cache is warm.                                                        |
| `./dev down`          | Stops and removes containers, volumes, and networks created by the dev kit.                                                     |
| `./dev seed`          | Replays the deterministic Postgres + Neo4j fixtures without touching running containers.                                        |
| `./dev test`          | Executes the end-to-end smoke: hello pipeline → API logs → Jaeger → Prometheus. Report written to `runs/dev-smoke/latest.json`. |
| `./dev logs api`      | Streams container logs for rapid debugging. Any service name from `docker compose ps` is accepted.                              |

The CLI is idempotent and safe to rerun; each command reports progress and exit
status so you can script it in CI or local hooks.

## Deterministic Seed Data

The seed runner (`server/scripts/seed-dev.ts`) installs:

- `tenant-dev` as the canonical tenant for local work (`DEV_TENANT_ID` controls
  the identifier if you need a different slug).
- Two investigations, including the constant ID
  `11111111-1111-1111-1111-111111111111` used by the smoke test.
- Representative users, audit log entries, and graph entities/relationships in
  Postgres and Neo4j for query demos.

Seeds can be re-applied at any time with `./dev seed` or by running
`npm run seed:dev --workspace=server` inside the devcontainer.

## Observability & Smoke Artifacts

- **Jaeger** – the smoke test polls `http://localhost:16686/api/services` until
  the `intelgraph-api` service appears. The enriched retry logging in
  `tools/devkit/smoke.js` surfaces retry attempts directly in the CLI output and
  report.
- **Prometheus** – metrics scrape lives at `http://localhost:9464/metrics` and
  the API server exports `http_requests_total` plus request latency buckets.
- **Smoke report** – inspect `runs/dev-smoke/latest.json` for timings,
  container log tail, trace service list, and Prometheus targets.

## Troubleshooting

| Symptom                                   | Resolution                                                                                                                                                                        |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./dev up` hangs on `postgres` or `neo4j` | Ensure no other local services occupy ports 5432/7687. Use `./dev down` followed by `docker ps` to confirm cleanup, then retry with `./dev up --no-build`.                        |
| Smoke test fails to reach Jaeger          | Confirm Docker Desktop exposes port 16686. The CLI now prints retry attempts; inspect `runs/dev-smoke/latest.json` → `steps[].attempts` and check `docker compose logs jaeger`.   |
| Metrics endpoint times out                | Ensure nothing else binds port 9464. Retry `./dev test`; if it continues failing, exec into the API container (`./dev exec api sh`) and run `curl http://localhost:9464/metrics`. |
| Authentication errors for GraphQL queries | The dev token `dev-token` is accepted when `NODE_ENV=development` and `DEV_TENANT_ID` matches the seeded tenant. Re-run `./dev seed` if you changed tenant IDs.                   |
| Vault container exits immediately         | The dev stack runs Vault in `-dev` mode. Delete any `vault/` data directory left over from prior runs before executing `./dev up` again.                                          |

If an issue persists, file a "Dev Environment" issue using the template in
`.github/ISSUE_TEMPLATE/dev_environment.yml` and attach the latest smoke report.

## Time-to-First-Success Checklist

- ⏱️ `./dev up` finishes (after image cache warm) within ~60 seconds.
- ✅ `./dev test` returns exit code 0 and produces `runs/dev-smoke/latest.json`.
- 🔁 Hot reload works when running `npm run dev` (changes to server/client code
  propagate without rebuilding containers).

Document the actual timestamps from your initial setup in the issue tracker or
onboarding notes so we can monitor the "new dev to green" SLO.
