# Private Cloud & On-Prem Reference Architecture

**Owner**: On-Prem, Private Cloud & Edge Deployments Team
**Status**: Draft
**Last Updated**: October 2025

## 1. Overview

This document provides the reference architecture for deploying CompanyOS in a **Mode C (On-Prem / Private Cloud)** environment. It assumes the customer is responsible for the underlying infrastructure (Compute, Network, Storage) and that CompanyOS runs as a containerized workload on top.

## 2. High-Level Architecture

The deployment is composed of three layers:
1.  **Infrastructure Layer** (Customer Provided)
2.  **Platform Layer** (Kubernetes or Docker Compose)
3.  **Application Layer** (CompanyOS Services)

```mermaid
graph TD
    subgraph "Customer Environment"
        subgraph "DMZ / Load Balancer"
            LB[Load Balancer / Ingress]
        end

        subgraph "Application Cluster (K8s / Docker)"
            API[Core API Service]
            Web[Web Client]
            Worker[Maestro Workers]
            Ingest[Ingestion Service]

            API --> DB
            API --> Graph
            API --> Cache
            Worker --> DB
            Worker --> Graph
        end

        subgraph "Data Persistence Layer"
            DB[(PostgreSQL)]
            Graph[(Neo4j)]
            Cache[(Redis)]
            Obj[Object Storage (S3 / MinIO)]
        end

        subgraph "Security & Ops"
            Auth[OIDC Provider (Keycloak / AD)]
            Logs[Log Aggregator (Splunk / ELK)]
            Metrics[Prometheus / Grafana]
            HSM[Key Management / HSM]
        end
    end

    LB --> Web
    LB --> API
```

## 3. Infrastructure Requirements

For a standard production deployment (supporting ~50 concurrent analysts):

| Component | Recommendation | Minimum |
| :--- | :--- | :--- |
| **Orchestration** | Kubernetes 1.25+ | Docker Compose (Single Node) |
| **Compute** | 3x Nodes (16 vCPU, 64GB RAM) | 1x Node (8 vCPU, 32GB RAM) |
| **Storage** | NVMe SSD (Database performance is critical) | SSD |
| **Network** | 10Gbps internal, mTLS enabled | 1Gbps |
| **GPU (Optional)** | NVIDIA A10/A100 (For local LLM inference) | CPU only (No local LLM) |

## 4. Packaging & Upgrade Story

We utilize a **"Push-to-Registry"** model for connected private clouds and a **"Tarball-Import"** model for air-gapped environments.

### 4.1. The Artifact Bundle
Whether connected or air-gapped, the release artifact is identical. It is a versioned collection containing:
*   **Container Images**: OCI-compliant images for all services.
*   **Helm Charts / Manifests**: Kubernetes definitions.
*   **Database Migrations**: SQL and Cypher scripts.
*   **OPA Policy Bundle**: Signed `.wasm` or `.rego` files.
*   **Init Scripts**: For bootstrapping infrastructure.

### 4.2. Upgrade Mechanism
CompanyOS supports **Rolling Upgrades** for stateless services and **Blue/Green** for critical data migrations.

1.  **Version Check**: Admin checks for new versions (or receives notification).
2.  **Backup**: Automated snapshot of Postgres and Neo4j.
3.  **Image Pull/Load**: New images are staged in the local registry.
4.  **Migration (Pre-Deploy)**: Schema changes that are backward compatible are applied.
5.  **Rolling Restart**: Application pods are cycled.
6.  **Verification**: Health checks (readiness/liveness) confirm stability.
7.  **Commit/Rollback**: If health checks fail, the system automatically reverts to the previous ReplicaSet.

### 4.3. Compatibility Rules
*   **N-2 Support**: We support upgrades from the current version (N) back to N-2.
*   **SemVer**: We strictly follow Semantic Versioning. Major version bumps may require scheduled downtime.
*   **Data Format**: We guarantee forward compatibility of data files.

## 5. Telemetry & "Phone Home"

In constrained environments, telemetry is a sensitive topic. We offer three tiers of "Phone Home" capability:

### Tier 1: Full Telemetry (Connected)
*   **Data**: Error rates, usage metrics, performance stats, anonymized stack traces.
*   **Mechanism**: HTTPS push to `telemetry.companyos.io`.
*   **Benefit**: Proactive support, predictive alerting.

### Tier 2: Heartbeat Only (Restricted)
*   **Data**: License status, version number, uptime, basic health bool (Green/Red).
*   **Mechanism**: HTTPS push once every 24 hours.
*   **Benefit**: License validation, basic supportability.

### Tier 3: Air-Gapped (Silent)
*   **Data**: None leaves the environment automatically.
*   **Mechanism**: Manual export of a "Support Bundle" (encrypted archive of logs/metrics) initiated by the admin when support is needed.
*   **Benefit**: Maximum security/privacy.

**Privacy Guarantee**: No customer data (PII, Graph Data, Knowledge Base) is ever included in telemetry. Only system health and performance metadata.

## 6. Storage & State Management

*   **PostgreSQL**: Stores relational data (Users, Projects, Audit Logs). Must be backed by persistent block storage.
*   **Neo4j**: Stores the Knowledge Graph. Highly IOPS sensitive. Requires fast local SSD or high-performance SAN.
*   **Redis**: Ephemeral cache and job queues.
*   **Object Storage**: Compatible with S3 API (AWS S3, MinIO, Ceph). Stores binary artifacts, evidence files, and backups.

## 7. Network Security & Ingress

*   **Ingress Controller**: Typically NGINX or Istio.
*   **TLS Termination**: Should happen at the Load Balancer or Ingress.
*   **mTLS**: Recommended for service-to-service communication within the cluster (Service Mesh).
*   **Egress**:
    *   *Connected*: Needs port 443 access to docker registries and telemetry endpoints (allowlisted).
    *   *Air-Gapped*: No egress required.

## 8. Identity & Access Management (IAM)

CompanyOS does not ship with a built-in user directory for On-Prem. We rely on **Federation**.
*   **OIDC / SAML**: We integrate with the customer's existing IdP (Okta, Active Directory, Keycloak).
*   **RBAC Mapping**: Customer groups are mapped to CompanyOS roles (Admin, Analyst, Viewer) via configuration.
