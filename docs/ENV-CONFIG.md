# Environment Configuration Reference

This document outlines the configuration required for the Summit Platform across different environments.
For deployment steps, refer to the [Deployment Quick Start Guide](./DEPLOYMENT.md).

## 1. Required Environment Variables

Create a `.env` file in the root directory based on `.env.example`.

**Core Variables:**

| Variable | Description | Default (Dev) |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API Server Port | `4000` |
| `DATABASE_URL` | PostgreSQL Connection URL | `postgresql://summit:devpassword@localhost:5432/summit_dev` |
| `NEO4J_URI` | Neo4j Bolt URI | `bolt://localhost:7687` |
| `REDIS_HOST` | Redis Hostname | `localhost` |
| `JWT_SECRET` | Secret for signing JWTs | *Change in Prod* |

*See `.env.example` for the complete list.*

## 2. Docker Compose Configuration

The local development environment is managed via `docker-compose.yml` and `docker-compose.dev.yml`.

**Key Services:**
- **postgres**: Main relational database (Port 5432).
- **neo4j**: Graph database (Ports 7474, 7687).
- **redis**: Cache and queue backing (Port 6379).
- **api**: Backend Node.js server (Port 4000).
- **ui**: Frontend Vite server (Port 3000).
- **otel-collector**: OpenTelemetry collector for observability.

## 3. Helm Chart Values

We use the `ig-platform` umbrella chart. Configuration is managed via `values.yaml` files.

**Key Parameters (`charts/ig-platform/values.yaml`):**

```yaml
global:
  env: production

image:
  repository: ghcr.io/brianclong/summit-api
  tag: latest

ingress:
  enabled: true
  host: app.summit.run

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi
```

## 4. GitHub Secrets Setup

The following secrets must be configured in the GitHub Repository settings for CI/CD:

- `DOCKER_USERNAME` / `DOCKER_PASSWORD`: For pushing images to GHCR.
- `KUBE_CONFIG`: Base64 encoded kubeconfig for the target cluster.
- `PROD_DB_URL`: Production database connection string.
- `SENTRY_AUTH_TOKEN`: For uploading source maps.

## 5. Environment Differences

| Feature | Local (Dev) | Staging | Production |
| :--- | :--- | :--- | :--- |
| **DB** | Docker Container | Cloud SQL / RDS (Sandbox) | Cloud SQL / RDS (High Avail) |
| **Logs** | Console | Cloud Logging | Cloud Logging + Aggregator |
| **Replicas** | 1 | 2 | Auto-scaling (min 3) |
| **Ingress** | N/A (Localhost) | `staging.summit.run` | `app.summit.run` |

## 6. Health Check Endpoints

- **API Health:** `GET /health` - Returns 200 OK with service status.
- **Detailed Health:** `GET /health/detailed` - Checks DB connectivity.
- **Metrics:** `GET /metrics` - Prometheus metrics.
