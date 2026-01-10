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

## Endpoint

- GraphQL endpoint: `http://localhost:<PORT>/graphql`, where `<PORT>` is `4000` when running `npm run server:dev` and `8080` when using the default `PORT` from `server/.env.example`.

## Next steps

- Try the [first-run tutorial](../tutorials/first-runbook.md) for live calls.
- Keep environment variables aligned via the [config reference](config.md).
