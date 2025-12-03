# IntelGraph Starter Pack

This starter pack gives you a runnable local stack that mirrors the intelgraph components called out in the handoff note: Neo4j, Postgres (provenance/audit), MinIO, Redis, OPA, an Apollo GraphQL gateway with OIDC/OPA hooks, and a pair of ingest stubs. Everything lives in `docker-compose.yml` so you can spin it up with one command and iterate quickly.

## What is included

- **Apollo GraphQL gateway** (`gateway/`)
  - Minimal SDL (`gateway/schema.graphql`) with entity + relationship types and a provenance audit mutation.
  - OIDC-ready middleware stub plus an OPA check hook you can wire to real Rego bundles.
- **Ingest stubs** (`ingest/`)
  - HTTP upload endpoint that writes uploads to MinIO.
  - CSV/S3 ingestion stub that reads the sample CSVs and posts them to the gateway mutation.
  - Mapping YAML to keep column → entity property mapping explicit.
- **Data plumbing**
  - Postgres schema for provenance/audit (`db/provenance.sql`).
  - Neo4j constraints (`neo4j/constraints.cypher`).
  - Sample CSV payloads for entities + relationships (`sample-data/*.csv`).
- **Ops + smoke**
  - k6 smoke script that exercises the GraphQL gateway and the ingest HTTP endpoint (`k6/smoke.js`).
  - Helm-like values baked into the compose file for quick overrides.

## Quickstart

```bash
# from repo root
cd intelgraph-starter

# start everything (foreground logs)
docker compose up

# or run detached
docker compose up -d
```

When compose is healthy:

- Gateway: http://localhost:4000/graphql (playground enabled in dev)
- Ingest API: http://localhost:4100
- MinIO console: http://localhost:9001 (creds: `minioadmin` / `minioadmin`)
- Postgres: localhost:5432 (`intelgraph` / `intelgraph`)
- Neo4j: bolt://localhost:7687 (`neo4j` / `letmein`)
- Redis: localhost:6379
- OPA: http://localhost:8181 (policy bundle path `/policies/intelgraph`)

## Workflows

### Load sample data via ingest stub

```bash
# from intelgraph-starter/
node ingest/server.js --seed sample-data/entities.csv --relationships sample-data/relationships.csv
```

The stub streams CSV rows, applies `mapping/entity-mapping.yaml`, and POSTs the mapped payloads to the gateway mutation. Replace the files with real exports when you are ready to upsert against production data.

### Run the smoke test

```bash
# requires k6 installed locally
k6 run k6/smoke.js
```

The script checks that the gateway responds to a query, that ingest accepts an upload, and that the S3->gateway loop is reachable. Adjust host/port with environment variables at the top of the script.

### Apply database primitives

```bash
# Postgres provenance schema
psql postgres://intelgraph:intelgraph@localhost:5432/intelgraph -f db/provenance.sql

# Neo4j constraints
cypher-shell -a bolt://localhost:7687 -u neo4j -p letmein -f neo4j/constraints.cypher
```

## Customization hooks

- **OIDC**: populate `OIDC_ISSUER`, `OIDC_CLIENT_ID`, and `OIDC_AUDIENCE` env vars in `docker-compose.yml` and plug your JWKS URL into `gateway/server.js`.
- **OPA**: drop Rego bundles in `opa/policies/` and mount them via the `opa` service volume; the gateway calls `POST /v1/data/intelgraph/allow`.
- **Storage**: change the MinIO bucket in `docker-compose.yml` and `ingest/server.js` to route uploads elsewhere; credentials are centralized in the compose env.

## Repo integration

Everything is self-contained under `intelgraph-starter/` so you can adapt pieces into the broader summit stack without colliding with existing services. The compose file names networks and volumes with the `intelgraph` prefix to avoid clashes when running alongside other projects.
