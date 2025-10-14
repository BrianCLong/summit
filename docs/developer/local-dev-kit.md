# Local Dev Kit & Golden Paths

The Local Dev Kit standardizes IntelGraph developer workstations so a new engineer can ship a green PR within one day. It packages the API, worker, UI, database, policy, and telemetry stacks behind a one-line `make dev` target with seeded data, mock services, and fast smoke coverage.

## Quick Start

1. Copy `.envrc.template` to `.envrc`, adjust any overrides, then `direnv allow`.
2. Run `make dev` to install dependencies and boot the Docker Compose profile (`api`, `ui`, `worker`, `postgres`, `redis`, `neo4j`, `opa`, `otel-collector`, `mock-services`).
3. Visit `http://localhost:3000` for the UI, `http://localhost:4000/health` for the API, and `http://localhost:16686` for Jaeger traces.
4. Execute `make smoke` (or rely on the pre-push hook) to verify the 60-second smoke suite before pushing.

## Target Service Archetypes (Definition of Ready)

| Archetype                 | Container                                           | Purpose                                                                 | Golden Path Check                    |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| **API Gateway**           | `api`                                               | Runs GraphQL/REST with hot reload, publishes OTEL traces.               | `/health`, GraphQL introspection.    |
| **UI Workbench**          | `ui`                                                | Vite dev server with live reload tied to mission snapshot fixtures.     | Root route smoke.                    |
| **Background Worker**     | `worker`                                            | BullMQ worker pool exposing `/health` and `/metrics`.                   | Worker health endpoint.              |
| **Policy Decision Point** | `opa`                                               | Serves policy bundles, seeded with residency and supply chain datasets. | OPA `/health` check.                 |
| **Observability Spine**   | `otel-collector`, `jaeger`, `prometheus`, `grafana` | Ships traces and metrics to Grafana dashboards.                         | OTEL metrics endpoint and Jaeger UI. |
| **Mock Services**         | `mock-services`                                     | Stable fixtures for golden paths, used by UI/API tests.                 | `/health`, dataset routes.           |

## Fixture Dataset Definitions

Fixture definitions live in `ops/devkit/fixtures/` and are applied automatically by `seed-fixtures`.

- `datasets.json` — Mission snapshots, policy evaluations, and worker telemetry including ownership metadata and golden path coverage.
- `graph.json` — Neo4j nodes/relationships linking personas to datasets (e.g., `DevkitDataset` ⇄ `DevkitPersona`).
- `scripts/devkit/seed-fixtures.js` — Seeds Postgres, Neo4j, and pushes persona data into OPA for policy tests.

Run `npm run devkit:seed` to reapply fixtures after manual database resets.

## Smoke Suite

The `smoke-test.js` harness (also run via `make smoke` and the pre-push hook) executes the following within 60 seconds:

1. UI root availability (`http://localhost:3000`).
2. API health plus GraphQL introspection.
3. Mock services heartbeat (`http://localhost:4010/health`).
4. Worker `/health` to ensure queues are ready.
5. OPA `/health` confirmation.
6. OTEL collector metrics endpoint (`http://localhost:9464/metrics`).
7. Jaeger UI reachability (`http://localhost:16686`).

## Make Targets

- `make dev` — Installs dependencies via `dev-setup`, then starts the devkit Compose profile with hot reload.
- `make dev-down` — Stops the stack and removes orphans.
- `make dev-parity` — Runs `scripts/devkit/check-parity.js` to ensure `.devcontainer/docker-compose.yml` matches `docker-compose.yml` core services.
- `make smoke` / `make smoke-ci` — Executes the smoke suite locally or in CI mode.

## Security & Secrets

- `.envrc.template` sources `.env` and exports non-production defaults. Copy to `.envrc` and never commit real credentials.
- Pre-push uses `scripts/hooks/verify-hook-signature.sh` to require signed `lefthook.yml` updates plus `gitleaks` scans.
- No production credentials are baked into images; all secrets come from developer-controlled `.env`/`.envrc` files.

## SLOs & Evidence

- **Onboarding TTV**: < 4 hours from cloning to passing `make smoke` (verified by the onboarding timer in `docs/developer/onboarding-dry-run.md`).
- **Smoke Flake**: < 1% via fast, idempotent HTTP checks.
- **Evidence Attachments**: Include parity report output, Grafana dashboard screenshots, and hook signature hash in weekly status updates.

## Kickoff Checklist

- [x] DoR artifacts: service archetypes (table above) and fixture definitions (`ops/devkit/fixtures`).
- [x] ADR PR opened (`docs/developer/local-dev-kit.md`) – tag Security, SRE, Product Ops.
- [x] Baseline dashboards: Grafana provisioning under `ops/observability/grafana`.
- [x] Synthetic probes: `smoke-test.js` + pre-push hook before first deploy.
- [x] Evidence attachments tracked in `docs/developer/onboarding-dry-run.md`.

## Follow-On (Track B)

- Evaluate cloud-based dev containers mirroring this stack.
- Automate ephemeral preview environments per PR using the same compose profile.
