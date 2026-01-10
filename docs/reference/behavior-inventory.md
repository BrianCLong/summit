---
title: "Behavior inventory"
summary: "Verified MVP-4 behaviors mapped to code and configuration sources."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "release"
---

# Behavior inventory

| Feature                                                                                                                 | Evidence                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Golden-path bootstrap, bring-up, and smoke test (`make bootstrap`, `make up`, `make smoke`)                             | `Makefile` targets for bootstrap, up/down, and smoke health checks.                                             |
| Docker Compose service surface (gateway, UI, policy compiler, AI NLQ, ER service, ingest, zk-tx, prov-ledger, predictd) | `docker-compose.dev.yaml` service definitions and ports.                                                        |
| Base data services (Neo4j, Redis, Postgres, policy-lac on 4000, report-studio UI on 3000)                               | `docker-compose.yml` definitions and exposed ports.                                                             |
| GraphQL runbook API (Runbook/Run types, RunState enums, queries and mutations)                                          | `packages/graphql/schema.graphql` schema contents.                                                              |
| Environment and rate-limit defaults for server                                                                          | `server/.env.example` variable list (database pools, Redis, JWT secrets, rate limits, OpenTelemetry exporters). |
| Root environment anchors for Neo4j and OIDC                                                                             | `.env.example` values (`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `OIDC_ISSUER`).                             |
| Health verification script for containers and endpoints                                                                 | `scripts/health-check.sh` HTTP checks and database connectivity probes.                                         |
| Database lifecycle commands                                                                                             | `package.json` scripts `db:migrate`, `db:seed`, `db:reset`.                                                     |
| Configuration validation command                                                                                        | `package.json` script `config:validate` executed through pnpm filter `intelgraph-server`.                       |

## Next steps

- Use this table while updating [release notes](../release-notes/mvp-4-ga.md).
- Cross-check commands in the [CLI reference](cli.md) when workflows change.
