# Graph PG Guard

A Postgres → Neo4j graph guard that captures changes from PG, projects them to a property‑graph, and flags drift.

## Usage

### Local Dev

1. Start services:
   ```bash
   cd packages/graph-pg-guard/docker
   docker compose up
   ```

2. Build and Run:
   ```bash
   # From root
   pnpm install
   pnpm run build -w packages/graph-pg-guard

   PG_URL=postgres://postgres:postgres@localhost:5432/postgres \
   NEO4J_URL=bolt://localhost:7687 \
   NEO4J_USER=neo4j \
   NEO4J_PASS=test \
   node packages/graph-pg-guard/dist/cli.js
   ```

### Features

* **Capture**: stream table inserts/updates/deletes from Postgres using logical decoding (currently skeleton).
* **Project**: turn rows + FKs into Neo4j **nodes** and **relationships**.
* **Reconcile**: run **idempotent upserts** so repeated events are safe.
* **Validate**: produce a **DriftReport** with actionable findings.
