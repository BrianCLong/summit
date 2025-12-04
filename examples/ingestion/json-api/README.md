# JSON API Ingestion Pipeline Example

This example shows how to ingest JSON API responses into Summit via the GraphQL API. It pulls pages from a generic REST endpoint, transforms them into investigation entities, and upserts them using a mutation.

## Prerequisites

- Node.js 20+
- Summit API available at `GRAPHQL_URL` (defaults to `http://localhost:4000/graphql`)
- An API token with permission to run ingestion mutations (`GRAPHQL_TOKEN`)

## Usage

```bash
cd examples/ingestion/json-api
node ingest.js
```

Edit the `sourceUrl` in `ingest.js` to point at your JSON feed. The script batches writes to avoid overwhelming the API.

## Notes

- Backpressure: the script caps concurrent requests and sleeps between pages to respect rate limits.
- Idempotency: documents are keyed by `externalId` so repeated runs update the same entities.
- Observability: responses include timing logs; pipe them to `jq` for quick validation.
