# GraphRAG Operations

This guide describes how to run the GraphRAG slice locally. All commands assume the repository root.

## Make Targets

```bash
make bootstrap
make up          # start core services (Neo4j, API, frontend)
make up-ai       # optional: start AI helpers
make smoke       # run smoke tests (expects GraphRAG query to succeed)
```

## Environment

- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` – Neo4j connection for GraphRAG services.
- `REDIS_URL` – optional cache for subgraph responses.
- `OPENAI_API_KEY` or compatible LLM provider key for generation.

Copy `.env.example` to `.env` and set the above variables before running services.

## Neo4j Indices & Constraints

Run migrations to ensure required indexes exist:

```bash
npm run db:neo4j:migrate
```

This script should be idempotent; rerunning it will not duplicate constraints.

## Smoke Test Workflow

1. Place sample markdown/JSONL files in `ingestion` input folder.
2. Run the ingestion job to populate Neo4j.
3. Execute `make smoke` – the test seeds documents, performs a GraphRAG query, and verifies a non‑empty answer payload.

Logs for GraphRAG operations can be viewed in the server console; metrics are exposed via Prometheus under the `graphrag_*` prefix.
