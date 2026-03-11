# Summit WOW Demo

The WOW demo is the fastest path from clone to visible graph + report output.

## Run

```bash
./scripts/wow-demo.sh
```

## What it does

1. Checks whether the API is reachable (`http://localhost:4000` by default)
2. Starts `./scripts/golden-path.sh` if API is unavailable
3. Ingests all files in `datasets/demo/` (`*.jsonl`, `*.csv`)
4. Sends a demo `runAgentSwarm` GraphQL mutation
5. Opens the report dashboard and Neo4j browser

## Environment overrides

You can override endpoints without editing the script:

```bash
API_BASE_URL=http://localhost:4000 \
GRAPHQL_URL=http://localhost:4000/api/graphql \
INGEST_URL=http://localhost:4000/api/ingest/batch \
WEB_URL=http://localhost:3000 \
NEO4J_URL=http://localhost:7474/browser \
./scripts/wow-demo.sh
```

## Included dataset bundle

- `datasets/demo/demo-companies.jsonl`
- `datasets/demo/demo-news-articles.jsonl`
- `datasets/demo/demo-relationships.csv`

## Notes

- The ingest endpoint and `runAgentSwarm` mutation are invoked best-effort; if your local schema differs, update `INGEST_URL` and `GRAPHQL_URL`.
- Keep the data small and deterministic so the first run stays fast.
