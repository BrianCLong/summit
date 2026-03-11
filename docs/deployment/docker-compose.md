# Docker Compose Deployment Guide

This guide covers deploying Summit using Docker Compose, typically used for single-node deployments, testing pipelines, or sandbox environments.

## Prerequisites
* Docker engine (v24+)
* Docker Compose plugin (v2+)
* Minimum 8GB RAM (16GB recommended) and 4 CPU cores available to Docker

## 1. Environment Configuration

Create a `.env` file in the directory where your `docker-compose.yml` (e.g., `deploy/docker-compose.yml`) resides. Refer to `docs/deployment/environment-variables.md` for the required values.

```bash
# Example .env structure (DO NOT commit actual values)
DATABASE_URL=postgresql://intelgraph:secret@postgres:5432/intelgraph?sslmode=prefer
REDIS_URL=redis://redis:6379/0
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=secret
# ... add OIDC, Integrations, and Entropy variables
```

## 2. Resource Requirements

Ensure your Docker daemon is configured with adequate resources:
* **PostgreSQL / Neo4j:** Allow sufficient RAM for graph traversals and database caching.
* **API Gateway / App:** Typically needs 1-2GB RAM.
* **Workers/Graph/Evidence:** Depending on ingestion and execution loads, allocating memory specifically to these components will stabilize your setup.

## 3. Deployment Steps

Our `deploy/docker-compose.yml` coordinates multiple services such as `runtime`, `scheduler`, `capture`, `evidence`, `graph`, and `api`. The dependencies are mapped logically.

### Step 3.1: Start Databases & Core Infrastructure (if externalized)
If you manage Postgres, Redis, and Neo4j locally via compose, start them first. Ensure they are healthy before the application layer starts.

```bash
docker compose up -d postgres redis neo4j
```

Wait for them to be ready. You can check logs using:
```bash
docker compose logs -f postgres neo4j
```

### Step 3.2: Run Database Migrations
Before starting the application code, execute schema migrations for Postgres and schema setup for Neo4j.

```bash
# Example standard migration command for our Node environments
docker compose run --rm api npm run db:migrate
```

### Step 3.3: Start Application Services
Once databases are migrated and ready, start the remaining services. The application components will respect their internal `depends_on` definitions.

```bash
docker compose up -d
```

## 4. Readiness and Liveness

The application containers should be configured with `healthcheck` blocks in the `docker-compose.yml` to ensure requests are routed only to healthy services. Ensure `HEALTH_ENDPOINTS_ENABLED=true` in your `.env`.

Example from a production-like compose file:
```yaml
healthcheck:
  test: ['CMD', 'curl', '-sf', 'http://localhost:3000/healthz']
  interval: 15s
  timeout: 3s
  retries: 20
  start_period: 30s
```

Ensure dependent services use `depends_on` with `condition: service_healthy` to guarantee correct startup ordering, preventing connection resets.

## 5. Scaling

While Docker Compose is not ideal for horizontal scaling across nodes, you can scale stateless workers on a single node:

```bash
docker compose up -d --scale evidence=2 --scale scheduler=2
```
