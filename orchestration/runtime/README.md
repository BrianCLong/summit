# Chronos Runtime

The Chronos runtime executes canonical workflow DAGs produced by the intent engine. It blends deterministic guarantees with policy-aware event journaling and observability hooks.

## Features
- Deterministic node execution with topological ordering and exponential retry policy.
- In-memory storage for quick testing plus optional Postgres persistence with automatic schema provisioning.
- Activity recording stubs for HTTP and Kafka interactions.
- OpenTelemetry middleware that emits stdout traces for every API request.

## Commands

```bash
make build   # Compile binaries
make test    # Run unit tests
make lint    # Execute go vet
make run     # Launch chronosd with default configuration
```

Set `PG_DSN` to point at a Postgres instance if you want persisted runs:

```bash
export PG_DSN="postgres://chronos:chronos@localhost:5432/chronos?sslmode=disable"
make run
```

## API Endpoints
- `POST /v1/start` – Launch a run. Body contains `{ "ir": IRDag, "actor": "name" }`.
- `GET /v1/status/{runId}` – Retrieve the current state of a run.

## Testing
Unit tests rely on the in-memory store for speed. The Nightly GitHub workflow runs the executor smoke test and publishes the compiled IR artifact for traceability.
