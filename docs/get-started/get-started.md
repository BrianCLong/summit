---
title: "Get started"
summary: "Bring up the Summit stack locally and confirm the MVP-4 success signal."
version: "MVP-4-GA"
lastUpdated: "2025-12-30"
owner: "docs"
---

# Get started

This guide delivers a first working Summit stack using the golden-path automation.

## Prerequisites

- Docker with Compose support
- Node 18+ with pnpm enabled
- Python 3.11+ (for the bootstrap virtualenv)

## Install and run

1. Clone and bootstrap dependencies:
   ```bash
   make bootstrap
   ```
2. Start the developer stack with Docker Compose:
   ```bash
   make up
   ```
3. Verify the stack end-to-end:
   ```bash
   make smoke
   ```

## Success signal

`make smoke` reports a healthy UI at `http://localhost:3000` and gateway health at `http://localhost:8080/healthz`. These checks come from the Makefile and curl validations baked into the smoke target.

## Configuration handoff

- Copy `.env.example` and `server/.env.example` to `.env` and `server/.env` to supply Neo4j, Postgres, Redis, and JWT secrets.
- If you use an external OTLP collector, set `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` before running `make up`.

## Next steps

- Complete the [first-run tutorial](../tutorials/first-runbook.md) to exercise the GraphQL runbook API.
- Keep the stack healthy with the [operations runbook](../operations/README.md).
