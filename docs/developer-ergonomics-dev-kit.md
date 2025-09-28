# Developer Ergonomics DevKit

The Golden Path DevKit standardizes local development so new engineers ship a green pull request in under one day.

## Stack Overview

| Service                  | Purpose                                     | Key Ports       |
| ------------------------ | ------------------------------------------- | --------------- |
| `api-dev`                | Express/GraphQL API with nodemon hot reload | 4000            |
| `client-dev`             | React/Vite frontend with hot module reload  | 3000            |
| `devkit-worker`          | BullMQ worker processing synthetic jobs     | 7000            |
| `mock-notify`            | Mock notifications + OPA status callbacks   | 7080            |
| `postgres`               | Seeded Postgres database                    | 5432            |
| `redis`                  | Queue backend                               | 6379            |
| `neo4j`                  | Graph store (APOC enabled)                  | 7474/7687       |
| `opa-devkit`             | OPA policy engine with devkit bundle        | 8181            |
| `otel-collector`         | OTLP receiver exporting to Prometheus       | 4317/4318/13133 |
| `prometheus` / `grafana` | Observability                               | 9090 / 8080     |

## Quickstart

1. Install [direnv](https://direnv.net/) and run `cp .envrc.template .envrc && direnv allow` to materialize local secrets (no prod credentials).
2. Launch the stack and seed fixtures:

   ```bash
   make dev
   ```

   This runs `npm run devkit:stack` (Docker Compose profile) and `npm run devkit:seed` (Postgres + Neo4j fixtures).

3. Visit the golden dashboards at http://localhost:8080 (Grafana) using the `DevKit Golden Path` dashboard.
4. Run the 60-second smoke suite anytime:

   ```bash
   npm run smoke
   ```

5. Tear down with `make dev-down`.

## Seed Fixtures

Fixture definitions live in `server/db/fixtures/local-dev.json`. They describe both Postgres tables (`devkit.cases`, `devkit.entities`) and Neo4j nodes/relationships. The `scripts/devkit/seed-fixtures.js` script enforces idempotent upserts so you can reseed without dropping the stack:

```bash
npm run devkit:seed
```

## Smoke + Provenance Guardrails

- `.githooks/pre-push` enforces the smoke suite and verifies commit signatures before every push. Install automatically via `.devcontainer/setup.sh` or run `git config core.hooksPath .githooks`.
- `scripts/devkit/verify-provenance.sh` validates the cosign supply-chain toolchain; CI runs it via `devkit-smoke.yml`.
- `npm run devkit:smoke` is provided for CI compatibility when the stack is already running.

## SLOs & Evidence

- Onboarding Time-to-Value target: **< 4 hours**. Capture metrics with `scripts/devkit/onboarding-timer.sh start` and `scripts/devkit/onboarding-timer.sh`.
- Smoke flake SLO: **< 1%**. Grafana dashboard `DevKit Golden Path` tracks pass/fail counts, while `.evidence/reports/devkit-onboarding-timer.json` stores onboarding runs.
- Weekly evidence lives in `.evidence/` and is linked from `.prbodies/pr-11.md` for auditability.

## Risks & Mitigations

- **Image drift**: the nightly job should run `docker compose --profile devkit pull` to maintain parity with production tags.
- **Heavy images**: worker/UI/API images share a base Node 20 layer and reuse caches; prefer `make dev-down` instead of `docker compose down -v` to preserve volumes.
- **Credential leaks**: `.envrc.template` keeps only local secrets; never check in real credentials.

## Golden Path Checklist

- [x] Devcontainer + Docker Compose stack with hot reload.
- [x] Seed fixtures and reseed script.
- [x] 60s smoke suite and signed pre-push hook.
- [x] Grafana dashboard + Alertmanager route.
- [x] Cosign provenance verification in CI.
