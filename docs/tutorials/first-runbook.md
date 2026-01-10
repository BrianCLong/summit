---
title: "First runbook tutorial"
summary: "Walk through bringing the stack up and hitting the GraphQL runbook API."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "docs"
---

# First runbook tutorial

Follow this path to see the platform responding to a real API query.

## Steps

1. Start the GraphQL API using either:
   - `npm run server:dev` (runs the server on port 4000), or
   - `npm run docker:dev` (uses `docker-compose.dev.yml`).
2. Confirm the API is ready:
   ```bash
   curl -f http://localhost:4000/health/ready
   ```
3. Query available runbooks from the GraphQL endpoint:
   ```bash
   curl -s -X POST http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"{ runbooks { id name version } }"}'
   ```
   The schema backing this query is defined in `packages/graphql/schema.graphql`.
4. Launch a run for an existing runbook ID (replace `RUNBOOK_ID` with one returned by step 3):
   ```bash
   curl -s -X POST http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"mutation Launch($id: ID!, $tenant: String!){ launchRun(input:{ runbookId:$id, tenantId:$tenant }) { id state } }","variables":{"id":"RUNBOOK_ID","tenant":"demo-tenant"}}'
   ```
5. Retrieve run status:
   ```bash
   curl -s -X POST http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"query RunStatus($id: ID!){ run(id:$id){ id state updatedAt } }","variables":{"id":"RUN_ID_FROM_STEP_4"}}'
   ```

## Expected outcome

- The runbook list endpoint returns a JSON payload (an empty list is acceptable in a fresh environment).
- `launchRun` returns a run identifier and state matching the schema definitions (`QUEUED`, `RUNNING`, `SUCCEEDED`, etc.).

## Next steps

- Automate this workflow via the [CLI and config reference](../reference/README.md).
- Add operational checks from the [runbook](../operations/README.md) to keep services healthy.
