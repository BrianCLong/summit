---
title: "Release notes - MVP-4 GA"
summary: "Highlights, changes, and known items for the MVP-4 GA cut."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "release"
---

# MVP-4 GA release notes

## Highlights

- Golden-path bring-up validated through `make bootstrap`, `make up`, and `make smoke` targets.
- GraphQL runbook surface defined in `packages/graphql/schema.graphql`, served at `/graphql` on the configured server port (`PORT` in `server/.env.example`, or 4000 when running `npm run server:dev`).
- Docker Compose bundles gateway, UI, policy compiler, AI NLQ, ER service, ingest, zk-tx, prov-ledger, predictd, and backing data stores (Neo4j, Postgres, Redis).

## Breaking changes

- None detected for the documented workflows; existing Makefile and npm commands remain stable.

## Known issues

- Runbook queries may return an empty list on fresh environments until data is loaded.
- Smoke checks rely on the gateway health endpoint at `/healthz`; custom gateways must expose the same path.

## Upgrade guidance

- Rebase local environment variables from `server/.env.example` to capture the latest rate limits and telemetry flags.
- Re-run `pnpm --filter intelgraph-server run config:validate` after pulling the release branch to confirm environment completeness.

## Next steps

- Review the [Operations guide](../operations/README.md) before deploying.
- Track ongoing roadmap updates in `docs/roadmap/STATUS.json`.
