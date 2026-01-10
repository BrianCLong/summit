---
title: "CLI reference"
summary: "Command catalog for Make targets and npm scripts used in MVP-4."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "devex"
---

# CLI reference

## Make targets

- `make bootstrap` – creates a Python virtualenv, installs dev dependencies (including pre-commit), and runs `pnpm install` for workspace packages.
- `make up` / `make down` – start or stop the developer Docker Compose stack defined by `docker-compose.dev.yaml`.
- `make smoke` – runs the golden-path health checks (UI at port 3000, gateway at port 8080/healthz) after bootstrapping and starting the stack.
- `make logs` – tail Compose logs for the active services.

## npm scripts (root package.json)

- `npm run dev` – starts server and client concurrently for local development.
- `npm run test` – runs the Jest suite defined for the monorepo.
- `npm run test:smoke` – aggregates backend (`server`) and frontend smoke suites.
- `npm run db:migrate` / `npm run db:seed` / `npm run db:reset` – database lifecycle helpers for Postgres.
- `npm run config:validate` – validates configuration using the `intelgraph-server` filter (runs via pnpm).
- `npm run schema:diff` / `npm run schema:validate` – compare GraphQL schema versions for breaking changes.

## Exit codes

- Success: `0` on all commands above when tasks complete.
- Failures: non-zero exit codes propagate from npm, pnpm, or the underlying tools (e.g., curl failures in `make smoke`).

## Next steps

- Configure variables with the [config reference](config.md).
- Trigger API requests with the [runbook tutorial](../tutorials/first-runbook.md).
