# Deployment Golden Path

This document defines the **single source of truth** for deploying the Summit/IntelGraph platform across all environments: Local Development, CI, and Production.

## Core Philosophy

1.  **Uniformity**: The exact same scripts used in CI are used in local development.
2.  **Explicit Dependencies**: No hidden environment variables or "magic" configurations.
3.  **Golden Path**: A single, tested, and verified sequence of operations to go from "zero" to "ready".

## The Golden Path Sequence

The lifecycle is defined by four canonical scripts located in `scripts/`:

1.  `./scripts/bootstrap.sh` - Installs dependencies and prepares the environment.
2.  `./scripts/start.sh` - Boots the runtime (Docker containers).
3.  `./scripts/healthcheck.sh` - Verifies the system is fully operational.
4.  `./scripts/teardown.sh` - Stops and cleans up the environment.

### 1. Bootstrap (`scripts/bootstrap.sh`)

**Purpose**: Prepare the host machine for running the application.

**Actions**:

- Checks for required tools (Docker, Node.js, Python).
- Installs Node.js dependencies (`pnpm install` or `npm install`).
- Sets up Python virtual environment (`.venv`) and installs requirements.
- Ensures a valid `.env` file exists (copies `.env.example` if missing).
- Installs/Verify development tools.

**Idempotency**: This script is safe to run multiple times. It will only perform necessary actions.

### 2. Start (`scripts/start.sh`)

**Purpose**: Launch the application runtime.

**Actions**:

- Validates environment configuration.
- Starts services via Docker Compose using `docker-compose.dev.yml` (the canonical definition).
- Waits for services to become healthy (calls `scripts/healthcheck.sh`).
- Runs database migrations (`scripts/run-migrations.sh`).

**Configuration**:

- Uses `docker-compose.dev.yml` in the project root.
- Loads environment variables from `.env`.

### 3. Health Check (`scripts/healthcheck.sh`)

**Purpose**: Verify that _all_ services are running and accepting traffic.

**Checks**:

- **PostgreSQL**: Connection ready.
- **Neo4j**: Cypher shell ready.
- **Redis**: PING response.
- **API**: `/health/ready` endpoint returns 200.
- **Gateway**: `/health` endpoint returns 200.
- **Web Client**: HTTP 200 on port 3000.

### 4. Teardown (`scripts/teardown.sh`)

**Purpose**: Clean shutdown.

**Actions**:

- Stops all containers defined in `docker-compose.dev.yml`.
- Removes orphans.

## Environment Configuration

The application relies on a single `.env` file in the project root.

- **Template**: `.env.example`
- **Local**: `.env` (gitignored)
- **CI**: Secrets injected via GitHub Secrets, mapped to env vars matching `.env.example`.

### Critical Variables

| Variable       | Description                  | Default (Dev)                                                  |
| :------------- | :--------------------------- | :------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://summit:summit_password@postgres:5432/summit_dev` |
| `NEO4J_URI`    | Neo4j Bolt URI               | `bolt://neo4j:7687`                                            |
| `REDIS_HOST`   | Redis Hostname               | `redis`                                                        |
| `JWT_SECRET`   | Secret for token signing     | _Must be set_                                                  |

## Usage Guide

### Local Development

```bash
# 1. First time setup
./scripts/bootstrap.sh

# 2. Start working
./scripts/start.sh

# ... write code ...

# 3. Verify changes
./scripts/healthcheck.sh

# 4. Stop
./scripts/teardown.sh
```

### CI/CD

CI pipelines **must** use these scripts to ensure the tested environment matches the development environment.

```yaml
steps:
  - uses: actions/checkout@v3
  - run: ./scripts/bootstrap.sh
  - run: ./scripts/start.sh
  - run: ./scripts/healthcheck.sh
  - run: npm test
  - run: ./scripts/teardown.sh
```

## Troubleshooting

- **Services fail to start**: Check `docker compose logs <service>`.
- **Health check timeout**: Ensure your machine has at least 8GB RAM allocated to Docker.
- **Migration failure**: Ensure PostgreSQL is healthy before running migrations (handled automatically by `start.sh`).
