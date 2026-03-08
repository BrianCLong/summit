# Summit Operations & Deployment Guide

## Deployment Topologies

### Local / Development (Docker Compose)
A lightweight setup for developers, utilizing local file system storage for evidence, local Postgres, and a local Graph store.

### Production (Kubernetes / Helm)
A scalable, highly-available deployment managed via Helm charts.
* **Compute**: Kubernetes deployments for services (Runtime, Scheduler, Capture Proxy, API Gateway).
* **Storage**: Managed Postgres (metadata), scalable Graph database (e.g., Neo4j), and S3-compatible object storage (evidence bundles).
* **Ingress**: Load balancer with TLS termination, routing to the API Gateway.

## Observability & Telemetry

* **Distributed Tracing**: OpenTelemetry traces requests across service boundaries (Scheduler -> Runtime -> Capture Proxy -> Evidence Store).
* **Metrics**: Prometheus metrics for module execution times, capture proxy latency, and evidence store capacity.
* **Logging**: Structured JSON logs aggregated centrally.

## Air-Gapped / Offline Mode

Summit supports strictly isolated environments:
1. **Network Disablement**: All external network calls are disabled via configuration.
2. **Replay Execution**: Modules execute exclusively using pre-captured artifacts ("source packs") loaded into the Evidence Store.
3. **Source Packs**: Signed datasets containing necessary raw captures for offline analysis.

## Performance Budgets

* **Module Timeouts**: Strict limits on individual module execution time to prevent resource hogging.
* **Concurrency**: Tenant-level concurrency caps for module execution.
* **Storage Quotas**: Configurable limits on evidence store usage per tenant.
