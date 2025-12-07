# IntelGraph Helm Patterns

This directory contains standard Helm charts for deploying IntelGraph services.

## Common Patterns

### Service Deployment
Use the `server` chart for any Node.js/TypeScript backend service.
- **Ingress**: Configured via `values.yaml` under `ingress`.
- **Secrets**: Use ExternalSecrets for production.
- **Monitoring**: Enable `serviceMonitor` for Prometheus scraping.

### Worker Deployment
Use `worker-python` for Python-based workers (e.g., ingestion).

### Database
Use `neo4j` and `postgres` charts for stateful dependencies.
Ensure PersistentVolumes are configured for production.

### Resilience
- **PodDisruptionBudgets**: Configured in each chart to ensure availability during upgrades.
- **HorizontalPodAutoscaler**: Enable `autoscaling` in `values.yaml` based on CPU/Memory.
