# Summit Platform & Environments Architecture

This document outlines the high-level architecture for Summit's infrastructure, ensuring a unified platform from development to production.

## Vision
Summit is built on a **Cloud-Native, Kubernetes-First** platform that prioritizes reproducibility, security, and developer experience.

## Core Pillars

1.  **Infrastructure as Code (IaC)**
    *   **Terraform**: Provisioning cloud resources (DBs, Buckets, Queues, VPCs).
    *   **Helm**: Managing Kubernetes manifests and application packaging.
    *   **GitOps (Future)**: Using ArgoCD to synchronize cluster state with the repo.

2.  **Containerization**
    *   **Docker**: Standard unit of deployment.
    *   **Registry**: GitHub Container Registry (GHCR) or ECR.
    *   **Strategy**: "Build Once, Deploy Anywhere". The same image runs in Dev, Staging, and Prod.

3.  **Observability & Telemetry**
    *   **Metrics**: Prometheus (infrastructure) + Application Metrics (custom).
    *   **Logs**: Structured JSON logging, centralized aggregation.
    *   **Tracing**: OpenTelemetry for distributed tracing across services.

4.  **Security & Governance**
    *   **Secrets**: Managed via external Secrets Manager (Vault/AWS Secrets Manager), injected as K8s Secrets.
    *   **Network**: Zero Trust principles, mTLS between critical services.
    *   **Compliance**: OPA Gatekeeper for policy enforcement.

## Architecture Layers

### Layer 1: Cloud Foundation (Terraform)
*   **Networking**: VPCs, Subnets, NAT Gateways.
*   **Persistence**: Managed Postgres (RDS/CloudSQL), Redis, Object Storage (S3/GCS).
*   **Compute**: Managed Kubernetes (EKS/GKE/AKS).

### Layer 2: Platform Services (Helm/K8s)
*   **Ingress Controller**: Nginx / ALB.
*   **Cert Manager**: Auto TLS.
*   **Observability Stack**: Prometheus, Grafana, Otel Collector.
*   **External Secrets Operator**: Syncing secrets.

### Layer 3: Application Workloads (Helm)
*   `summit-core`: API Server, Workers.
*   `summit-web`: Frontend static assets / SSR.
*   `summit-intelgraph`: Graph services.
*   `summit-maestro`: Orchestration engine.

## Directory Structure
*   `terraform/`: Cloud resource definitions.
*   `kubernetes/charts/`: Application Helm charts.
*   `kubernetes/manifests/`: Platform service manifests.
*   `.github/workflows/`: CI/CD pipelines.
