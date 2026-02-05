# Deployment Guide

This guide covers the deployment process for Summit to production environments.

## Deployment Architecture

We deploy using **Kubernetes** (K8s) and **Helm**.

- **API Server**: Node.js deployment, scaled horizontally.
- **Worker**: Background job processors.
- **Web Client**: Nginx container serving static React build.
- **Databases**: Managed instances (e.g., RDS, Aura) or stateful sets.

## Prerequisites

- **Kubernetes Cluster**: v1.24+
- **Helm**: v3+
- **Docker Registry**: Access to push images.
- **Secrets Management**: Vault or K8s Secrets.

## Build Process

1.  **Build Docker Images**
    ```bash
    docker build -t registry.example.com/summit-server:latest -f server/Dockerfile .
    docker build -t registry.example.com/summit-web:latest -f client/Dockerfile .
    ```

2.  **Push Images**
    ```bash
    docker push registry.example.com/summit-server:latest
    docker push registry.example.com/summit-web:latest
    ```

## Deployment via Helm

1.  **Update Values**
    Edit `charts/summit/values.yaml` or create a `values-prod.yaml`.

    ```yaml
    image:
      repository: registry.example.com/summit-server
      tag: latest

    env:
      NODE_ENV: production
      NEO4J_URI: "bolt://prod-neo4j:7687"
    ```

2.  **Install/Upgrade**
    ```bash
    helm upgrade --install summit ./charts/summit -f values-prod.yaml --namespace summit

## Production Deployment Script

Use the production deployment script for repeatable, validated deploys:

```bash
./scripts/deploy-summit-production.sh deploy
```
    ```

## Manual Deployment (Docker Compose)

For small deployments or staging:

```bash
docker compose -f docker-compose.prod.yaml up -d
```

## Configuration

Configuration is managed via Environment Variables. See `ENV_VARS.md` for a complete list.

**Critical Production Variables:**
- `NODE_ENV=production`
- `JWT_SECRET`: High entropy secret.
- `DB_PASSWORD`: Strong passwords.
- `CORS_ORIGIN`: Restrict to your domain.

## Monitoring & Logging

- **Metrics**: Prometheus scrapes `/metrics`.
- **Logs**: JSON formatted logs to stdout/stderr. Collect via Fluentd/Filebeat.
- **Tracing**: OpenTelemetry configured via `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Rollback

In case of failure:

```bash
helm rollback summit 1 --namespace summit
```
