---
title: CLI Reference
summary: Reference for Make and PNPM commands.
version: v2.0.0
lastUpdated: 2025-12-29
---

# CLI Reference

## Make Commands

The `Makefile` provides high-level orchestration for the development environment.

| Command          | Description                                                          |
| :--------------- | :------------------------------------------------------------------- |
| `make bootstrap` | Installs dependencies, sets up `.env`, and prepares the environment. |
| `make up`        | Starts all services in Docker (detached mode).                       |
| `make up-ai`     | Starts services including AI/ML components.                          |
| `make down`      | Stops and removes all containers.                                    |
| `make smoke`     | Runs the "Golden Path" smoke test against the running stack.         |
| `make help`      | Lists all available make targets.                                    |

## PNPM Commands

We use `pnpm` for package management and script execution.

| Command               | Description                                              |
| :-------------------- | :------------------------------------------------------- |
| `pnpm install`        | Installs all dependencies respecting the lockfile.       |
| `pnpm run dev`        | Starts client and server in development mode (parallel). |
| `pnpm run server:dev` | Starts only the backend server.                          |
| `pnpm run client:dev` | Starts only the frontend client.                         |
| `pnpm run build`      | Builds the project for production.                       |
| `pnpm run test`       | Runs the full test suite.                                |
| `pnpm run test:quick` | Runs a subset of fast unit tests.                        |
| `pnpm run lint`       | Runs ESLint and Prettier checks.                         |
| `pnpm run typecheck`  | Runs TypeScript compiler checks.                         |
| `pnpm run db:migrate` | Runs PostgreSQL/Neo4j migrations.                        |
| `pnpm run db:seed`    | Seeds the database with default data.                    |
| `pnpm run docker:dev` | Wrapper for `docker-compose -f docker-compose.dev.yml`.  |
