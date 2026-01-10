# Summit (IntelGraph)

> Enterprise intelligence platform delivering graph analytics, real-time collaboration, and AI-assisted investigations.

## What is inside

- **Data and orchestration**: Neo4j for graph state, PostgreSQL for structured data, Redis for caching and rate limits. (See `server/.env.example`.)
- **APIs**: GraphQL surface for runbook execution (see `packages/graphql/schema.graphql`).
- **Tooling**: Make targets and npm scripts for bootstrap, smoke testing, schema validation, and releases (`Makefile`, `package.json`).

## Quickstart (copy/paste)

Prerequisites: Docker, Node 18+, pnpm, Python 3.11+.

```bash
# 1) Clone and bootstrap dependencies
make bootstrap

# 2) Start the developer stack (Docker Compose)
make up

# 3) Verify the stack
make smoke
```

You know it worked when `make smoke` reports the UI at `http://localhost:3000` and the gateway at `http://localhost:8080/healthz` as healthy.

## Configuration

- Copy `.env.example` and `server/.env.example` to provide Neo4j, PostgreSQL, Redis, and OIDC values. Key variables include `DATABASE_URL`, `NEO4J_URI`, `REDIS_HOST`, `JWT_SECRET`, and `CORS_ORIGIN`.
- Run `pnpm --filter intelgraph-server run config:validate` to confirm env files meet validation rules.
- Set OpenTelemetry exporters with `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` if you want traces and metrics during local runs.

## Common errors + fixes

- **Smoke test UI check fails**: Ensure Docker is running and ports 3000/8080 are free before `make up`; rerun `make smoke` after containers stabilize.
- **Database connection errors**: Verify `DATABASE_URL` in `server/.env.example` points to the running Postgres container (`postgres:16-alpine` in `docker-compose.yml`).
- **GraphQL playground unreachable**: Confirm the server is running on the expected port (4000 for `npm run server:dev`, or the `PORT` set in `server/.env`) and that `CORS_ORIGIN` includes the UI origin.

## Support & contributing

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for workflows and coding standards.
- Follow the golden path targets in the Makefile (`make smoke`, `make test`) before opening a PR.
- Security issues should be reported via [SECURITY.md](SECURITY.md).
