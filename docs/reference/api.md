---
title: "API reference"
summary: "GraphQL schema surface for runbooks and runs."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "api"
---

# API reference

## GraphQL types

- `Runbook`: fields `id`, `name`, `version`, `dag`, `createdAt`.
- `Run`: fields `id`, `runbookId`, `tenantId`, `state`, `createdAt`, `updatedAt`.
- `RunState`: `QUEUED`, `LEASED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `TIMED_OUT`, `ABORTED`.

## Queries

- `runbooks(limit: Int = 50, after: ID): [Runbook!]!`
- `run(id: ID!): Run`

## Mutations

- `launchRun(input: LaunchRunInput!): Run!` (fields: `runbookId`, `tenantId`, optional `params`).
- `abortRun(id: ID!): Run!`

## Endpoints

- Default GraphQL endpoint: `http://localhost:4000/graphql` (Compose policy-lac service) and `http://localhost:8080/graphql` when routed through the gateway.

## Next steps

- Try the [first-run tutorial](../tutorials/first-runbook.md) for live calls.
- Keep environment variables aligned via the [config reference](config.md).
