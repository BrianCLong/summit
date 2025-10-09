# Summit v0.1.0 Docker Release ![GA](https://img.shields.io/badge/release-v0.1.0-blue) ![SLO API](https://img.shields.io/badge/SLO_API-99.9%25-green) ![SBOM](https://img.shields.io/badge/SBOM-attached-success) ![Provenance](https://img.shields.io/badge/provenance-signed-success)

# Summit v0.1.0 Docker Release

This is the complete Summit platform Docker release package with core services and app layer ready for deployment.

## Services

### Core Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 15432 | Primary relational database |
| Redis | 16379 | In-memory data store/cache |
| Neo4j | 17474 (browser), 17687 (bolt) | Graph database |
| Adminer | 18080 | Database management UI |

### App Services (Coming Soon)

| Service | Port | Description |
|---------|------|-------------|
| API | 18081 | GraphQL/REST API server |
| Web | 18082 | Client application |

## Quick Start

```bash
# Start core services only
make up

# Start app services on top of core (when images ready)
make app

# Start observability stack (separate)
make obs

# Check status
make ps

# View logs
make logs

# Verify core services are running
make verify

# Test app services (when running)
make smoke

# Stop and remove everything
make down
```

## Access

- **Adminer UI**: http://localhost:18080
  - PostgreSQL: localhost:15432, user: summit, password: postgrespass
- **Neo4j Browser**: http://localhost:17474 (uses default neo4j/neo4jpass credentials)
- **Neo4j Bolt**: bolt://localhost:17687
- **API**: http://localhost:18081 (when app services are running)
- **Web UI**: http://localhost:18082 (when app services are running)

## Configuration

All configuration is in `.env`. Adjust as needed, including:

### Required Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `POSTGRES_DB` | summit | PostgreSQL database name |
| `POSTGRES_USER` | summit | PostgreSQL user |
| `POSTGRES_PASSWORD` | postgrespass | PostgreSQL password |
| `REDIS_PASSWORD` | redispass | Redis authentication |
| `NEO4J_AUTH` | neo4j/neo4jpass | Neo4j username/password |

### Port Configuration (High Ports to Avoid Conflicts)
| Variable | Default | Service |
|----------|---------|---------|
| `POSTGRES_PORT` | 15432 | PostgreSQL host port |
| `REDIS_HOST_PORT` | 16379 | Redis host port |
| `NEO4J_HTTP_PORT` | 17474 | Neo4j HTTP browser port |
| `NEO4J_BOLT_PORT` | 17687 | Neo4j Bolt protocol port |
| `ADMINER_PORT` | 18080 | Adminer UI port |
| `API_PORT` | 18081 | API service port |
| `WEB_PORT` | 18082 | Web UI port |

### Optional Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `NEO4JLABS_PLUGINS` | ["apoc"] | Neo4j plugins |
| `NEO4J_PASSWORD` | neo4jpass | Neo4j password (separate var) |
| `LOG_LEVEL` | info | Application logging level |

## Architecture

- `docker-compose.fresh.yml` - Core database services with profiles
- `docker-compose.app.yml` - Application services layer
- `docker-compose.observability.yml` - Metrics and logging stack

Services are organized using Docker Compose profiles for flexible deployment:
- `core` profile: Essential database services (PostgreSQL, Redis, Neo4j, Adminer)
- `app` profile: Application layer (API, Web) - depends on core

## Runbook

- **Start core:** `make up && make verify`
- **Start app on core:** `make app`
- **Open UIs:** Adminer `:18080`, Neo4j Browser `:17474`
- **Check app:** API `:18081`, Web `:18082`
- **Logs:** `make logs`
- **Stop & remove:** `make down`
- **Core health check:** `make verify`
- **App smoke tests:** `make smoke`

## Extending with App Services

1. Ensure images `summit/api:v0.1.0` and `summit/web:v0.1.0` are available
2. Run `make app` to start application layer on top of core services
3. Verify with `make smoke`

## Troubleshooting

- **"port already in use"**: Check for existing processes on high ports
- **Service not responding**: Wait a few seconds for full startup, especially Neo4j which can take 1-2 minutes
- **Permission issues with containers**: Some containers may have been started with sudo; use `sudo docker` commands if needed
- **Profile not working**: Ensure Docker Compose v2.19+ (profiles feature)

## Permissions & Cleanup

Docker on Linux talks via `/var/run/docker.sock`. If containers/volumes were created with `sudo`,
they'll be owned by root and normal `docker` commands may fail. Use the steps below to fix.

### 1) Enable non-root Docker usage
```bash
# Ensure the docker group exists and you're a member
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker "$USER"

# Activate group membership for the current shell (or log out/in)
newgrp docker

# Sanity check (should not require sudo; prints "Hello from Docker!")
docker run --rm hello-world
```

> Avoid permanently `chmod 666` on `docker.sock`. Group membership is the safer fix.

### 2) Clean up root-owned Summit resources (safe & scoped)

If earlier runs used `sudo`, clean them up with `sudo` **once**, scoped to this project.

```bash
# Stop/remove any summit-fresh or summit-core containers
sudo docker ps -aq --filter "name=summit-fresh" --filter "name=summit-core" | xargs -r sudo docker stop
sudo docker ps -aq --filter "name=summit-fresh" --filter "name=summit-core" | xargs -r sudo docker rm -f

# Remove project networks created by older runs (non-breaking if absent)
sudo docker network ls --format '{{.Name}}' | grep -E '^summit-(fresh|core)_' | xargs -r sudo docker network rm

# Optionally prune dangling images/volumes left by previous failures (interactive)
sudo docker system prune -f
sudo docker volume prune -f
```

### 3) Fix volume ownership (only if you need to keep data)

If you want to **keep** existing data volumes but make them readable by your user:

```bash
# List volumes for this project
docker volume ls --format '{{.Name}}' | grep -E '^summit-(fresh|core)_' || true

# For each volume you want to keep, chown its _data dir (example shown)
VOL="summit-fresh_pgdata"
sudo chown -R $(id -u):$(id -g) /var/lib/docker/volumes/${VOL}/_data
```

### 4) Bring the stack up without sudo

```bash
# Core only
make up && make verify

# App layer on top (when images are available)
make app && make smoke
```

### 5) If ports are taken

Use high host ports via `.env` (already set in this release). Change as needed:

```
POSTGRES_PORT=15432
REDIS_HOST_PORT=16379
NEO4J_HTTP_PORT=17474
NEO4J_BOLT_PORT=17687
ADMINER_PORT=18080
API_PORT=18081
WEB_PORT=18082
```

### 6) Compose profiles & version

Profiles require Docker Compose v2.19+. Check with:

```bash
docker compose version
```

If older, upgrade Docker Desktop/Engine or install recent `docker-compose-plugin`.
## 🔄 Day-2 Operations

### Gold Runbook (Pin This!)

* **Cold start**: `make up && make verify` → `make app && make smoke`
* **Upgrade** (patch): bump digests in compose file → `make app`; if issues: `make down && make up && make app`
* **Rollback**: revert compose digests to prior GA; `make app` (no data loss)
* **Backup**: `make dr-drill` monthly (prove restore path)
* **Cleanup**: `make nuke` (scoped) only when switching privilege contexts
* **Health**: check alerts + Grafana landing; tail `make logs` for exceptions

### Operations Guide

- **Upgrade**: Update image digests in docker-compose.app.yml and run `make app`
- **Backup**: Use the volume backup commands in the README
- **Restore**: Stop services, restore volumes, then `make up`
- **Cleanup**: `make nuke` for safe removal of Summit resources
- **Health checks**: `make verify` for core, `make smoke` for app, `make smoke2` for enhanced checks
- **DR testing**: `make dr-drill` to run disaster recovery drill
- **Evidence collection**: `make evidence` to gather release artifacts
- **Security checks**: `make sentinel` and `make config-contract` to verify configuration integrity

## License

This project is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for details.
