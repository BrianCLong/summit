# Day-1 Multi-Region Topology & Security Architecture

## Overview
The day-1 deployment delivers a regulated, multi-tenant SaaS control plane with regional sharding. It prioritises interoperability across partner ecosystems, enforces clear service contracts, and maintains an offline/air-gapped option for missions that cannot use the shared cloud exchange.

## Drivers & Constraints
- Uphold the platform SLOs (API success rate 99.9%, p95 query latency <1.5s, job success rate 99%) while meeting FedRAMP High, CJIS, and GDPR obligations.
- Default to multi-tenant SaaS, with workload placement options for single-tenant regulated customers within regional cells.
- Provide clean API contracts (GraphQL + REST) and schema-governed Kafka topics to allow partner integration without tight coupling.
- Preserve an offline export/import path to serve disconnected or air-gapped operators.

## Day-1 Topology
```mermaid
graph TD
  subgraph Internet Edge
    Tenant[External Tenants]
    GW[API Gateway\nEnvoy+WAF]
    Tenant -->|OIDC/OAuth2| GW
  end

  subgraph Region Cell A
    subgraph ControlPlaneA[Control Plane]
      MeshCA[Mesh CA\nSPIFFE]
      OPA[OPA Policy Agents]
      CI[Config Service]
    end

    subgraph DataPlaneA[Data Plane]
      AppSvc[Orchestrator API]\nApp Pods
      Neo4j[(Neo4j Cluster)]
      Postgres[(Postgres HA)]
      Redis[(Redis Cache)]
      Kafka[(Kafka Cluster)]
    end

    GW -->|mTLS via mesh| AppSvc
    AppSvc --> Neo4j
    AppSvc --> Postgres
    AppSvc --> Redis
    AppSvc --> Kafka
    OPA -->|Policy Pull| AppSvc
    MeshCA -->|Spiffe/SVID| AppSvc
    MeshCA --> OPA
  end

  subgraph Region Cell B
    GW_B[Edge Gateway]
    AppSvc_B[Regional App Stack]
    Neo4j_B[(Neo4j Read Replica)]
    Postgres_B[(Logical Replica)]
    Redis_B[(Read Cache)]
    Kafka_B[(Mirror Maker)]
    GW -.->|Global Control| GW_B
    Kafka -.->|Async Mirror| Kafka_B
    Postgres -.->|Logical Replication| Postgres_B
    Neo4j -.->|Fabric Streams| Neo4j_B
    AppSvc -.->|Control Plane Sync| AppSvc_B
  end

  subgraph Offline Cell
    OfflineIngest[Offline Loader]
    OfflineStore[(Immutable Object Store)]
    OfflineNeo4j[(Offline Neo4j)]
    OfflinePg[(Offline Postgres)]
    Kafka -->|Signed Export| OfflineIngest
    OfflineIngest --> OfflineStore
    OfflineIngest --> OfflineNeo4j
    OfflineIngest --> OfflinePg
  end
```

### Component Responsibilities
- **API Gateway:** Terminates TLS, enforces WAF and rate limits, validates tenant-scoped JWTs, and routes to mesh workloads.
- **Service Mesh:** SPIFFE/SPIRE issued identities ensure mTLS between gateway sidecars and workloads; mesh also propagates retry budgets aligned with SLO error budgets.
- **OPA Policy Layer:** Control plane that distributes tenant-aware policies to gateway and services for request-time and data-filter enforcement.
- **Neo4j/Postgres:** Dual-write graph + relational persistence; Postgres handles transactional compliance data; Neo4j powers relationship intelligence.
- **Redis:** Multi-tenant cache with namespace isolation and eviction guardrails to protect the 1.5s latency SLO.
- **Kafka:** Durable event backbone for ingestion, audit, and asynchronous fan-out; MirrorMaker enables regional spillover and offline export bundles.

## Tenancy & Isolation Decisions
- Shared control plane per region with logical tenant segmentation at the API, Kafka topic prefix, and database schema levels.
- Regulated tenants can be pinned to a dedicated data-plane slice (isolated Neo4j/Postgres schemas and Redis logical databases) without duplicating the control plane.
- Regional shards (Cells A/B) contain blast radius; failure in one cell is absorbed by others without global outage so long as SLA breach probability <5% of monthly error budget.

## Network Security & mTLS Layout
- External traffic enters via AWS ALB + Envoy gateway with TLS 1.3 and mutual TLS between gateway sidecars and application pods.
- SPIFFE IDs represent service + tenant boundary; authorization checks via OPA and service-level RBAC policies.
- Kafka brokers and database endpoints require client certificates signed by Mesh CA; offline exporters rotate keys daily.

## Deployment, Canary, & Rollback
- Canary channel deploys a single app slice (`appsvc-canary`) fed by 5% of traffic using header-based routing and isolated Kafka topic partitions.
- Automated health probes evaluate API success rate and p95 latency for 15 minutes before progressive rollout.
- Rollback uses Argo Rollouts blue/green: switch gateway routes back to stable slice if error budget burn exceeds 2% in 10 minutes, followed by config sync rollback and cache invalidation sweep.

## Offline / Air-Gapped Path
- Daily signed bundles (Kafka topics, Postgres dumps, Neo4j export) are staged in immutable storage, transferred via hardware token to offline cell.
- Offline cell replays Kafka via checksum-verified loader and rehydrates graph + relational stores without contacting the shared control plane.

## Observability & SLO Alignment
- Per-cell dashboards track API success rate, latency, and job completion metrics; OPA decisions and mTLS handshake failures feed central SIEM.
- Synthetic checks validate tenant isolation by replaying redacted traffic across shards; failure triggers canary rollback runbook.

## Threat Model (STRIDE)
| STRIDE | Scenario | Impact | Controls & Mitigations |
| --- | --- | --- | --- |
| Spoofing | Compromised client impersonates tenant via stolen token | Unauthorized data access; SLO breach via abuse | Short-lived OIDC tokens, mTLS with SPIFFE, audience-bound JWTs, continuous token anomaly detection |
| Tampering | Man-in-the-middle alters Kafka events between cells | Corrupt analytics and audit logs | TLS 1.3 + mTLS on brokers, SHA-256 signing of export bundles, schema validation in ingestion services |
| Repudiation | Tenant denies sensitive query execution | Compliance risk, audit gaps | Immutable Kafka audit topics, signed request logs in Postgres, OPA decision logs shipped to SIEM |
| Information Disclosure | Cross-tenant data leak through cache bleed | Regulatory breach, SLA penalties | Redis key namespaces per tenant, cache eviction fences, automated isolation tests |
| Denial of Service | Coordinated traffic spike saturates gateway | Breached availability SLO | WAF rate limits, autoscaling with predictive scaling, circuit breakers with retry budgets |
| Elevation of Privilege | Compromised service pod invokes admin APIs | Data-plane corruption | Workload identities limited via SPIFFE trust domain, OPA ABAC policies, privileged APIs isolated on dedicated namespace |

## Abuse & Misuse Cases
1. **Tenant attempts to bypass per-region residency restrictions.** Control: enforce residency via policy tags and refuse cross-region token claims.
2. **Operator uploads malicious Cypher/SQL intended to exfiltrate other tenant data.** Control: policy-managed allowlists, query analysis, and execution sandboxing.
3. **Adversary floods Kafka with synthetic events to exhaust storage.** Control: quota-managed partitions, DLQ monitoring, and auto throttling per tenant.
4. **Malicious insider attempts to disable OPA policies.** Control: GitOps-managed policy bundles with 4-eye approval and tamper-evident logs.

## Compensating Controls
- Daily config drift report ensures mesh identities and OPA bundles align with GitOps state.
- Automated chaos drills validate cell isolation and rollback readiness each sprint.
- Break-glass roles monitored via Just-in-Time elevation, with session capture and mandatory post-incident review.
- Offline bundle transfer requires dual custody and hardware token attestation.
