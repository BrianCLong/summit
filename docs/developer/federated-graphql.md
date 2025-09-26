# Federated GraphQL Gateway

This guide explains how to query the Apollo Federation gateway that stitches together the IntelGraph core graph, ML engine, and ingest service subgraphs.

## Deployment overview

The Helm `charts/gateway` chart now injects the following environment variables into the gateway pod:

- `FEDERATION_SUBGRAPHS`: JSON array describing subgraph names and URLs. Defaults to the core, ML engine, and ingest services.
- `FEDERATION_USE_LOCAL`: When set to `true`, the gateway uses the in-process mock subgraphs that ship with the codebase (handy for dev or tests).
- `FEDERATION_POLL_INTERVAL_MS`: Optional refresh interval for supergraph polling when targeting remote services.

Update the values files (`values.yaml`, `values-staging.yaml`, `values-prod.yaml`) to point at the correct service URLs per environment.

## Example query

```graphql
query EntityOverview($id: ID!, $status: String!) {
  entity(id: $id) {
    id
    name
    type
    attributes
    ingestEvents(status: $status) {
      id
      status
      source
    }
    latestIngestEvent {
      id
      status
    }
    mlJobs {
      id
      status
    }
    latestMlJob {
      id
      status
      result
    }
  }
}
```

Example variables:

```json
{
  "id": "entity-1",
  "status": "COMPLETE"
}
```

The gateway merges data from the three subgraphs, so a single request returns the latest ingest event, job queue state, and historical ML results for a given entity.

## Local testing

1. Ensure dependencies are installed (`npm install` inside `server/`).
2. Run the Jest suite from the `server` directory:

   ```bash
   npm test -- tests/federation/gateway.test.ts
   ```

   The tests instantiate the gateway using the in-process mock subgraphs and exercise stitched queries across all three services.

3. To hit the gateway manually, set `FEDERATION_USE_LOCAL=true` and run the server bootstrap that consumes `createFederatedApolloServer()`.

## Observability tips

- `createFederatedApolloServer` exposes a plugin that gracefully drains the Apollo Gateway on shutdown, so the gateway can be safely cycled by Kubernetes without dropping inflight requests.
- The `federationSeedData` export in `server/graphql/federation/index.ts` surfaces the mock datasets, which can be useful for local GraphQL Playground exploration.
