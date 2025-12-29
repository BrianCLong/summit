---
title: Service Catalog
summary: Exhaustive inventory of microservices and their responsibilities.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Service Catalog

Summit is composed of **150+ microservices** organized into functional domains. This catalog provides a high-level inventory.

## 🟢 Core Platform (The Golden Path)

| Service              | Responsibility                                                                        | Port | Stack        |
| :------------------- | :------------------------------------------------------------------------------------ | :--- | :----------- |
| **`server` / `api`** | **Central Monolith**. GraphQL/REST API, Auth, Orchestration (Maestro), Narrative Sim. | 4000 | Node/Express |
| **`client`**         | **Frontend**. React/Vite SPA for analysts.                                            | 3000 | React        |
| **`gateway`**        | **Edge Router**. Ingress, Load Balancing, WAF.                                        | 4100 | Nginx/Node   |

## 🧠 AI & Intelligence Domain

| Service                         | Responsibility                                                  |
| :------------------------------ | :-------------------------------------------------------------- |
| **`services/ai-copilot`**       | LLM integration for natural language queries and summarization. |
| **`services/ai-nlq`**           | Natural Language to Query (Cypher/SQL) transpiler.              |
| **`packages/ocr`**              | Optical Character Recognition (Shared Lib).                     |
| **`packages/computer-vision`**  | Object detection (YOLO) and face recognition (MTCNN).           |
| **`packages/narrative-engine`** | "EvoSim" engine logic (Executed within `server`).               |

## 📊 Data & Analytics Domain

| Service                           | Responsibility                                               |
| :-------------------------------- | :----------------------------------------------------------- |
| **`services/graph-ops`**          | Low-level Neo4j operations and maintenance.                  |
| **`apps/analytics-engine`**       | Batch processing for graph algorithms (PageRank, Community). |
| **`services/timeseries-metrics`** | High-volume metric ingestion (TimescaleDB).                  |
| **`apps/search-engine`**          | Full-text and vector search (Elasticsearch/Postgres).        |
| **`services/search`**             | Search orchestration and API.                                |

## 🛡️ Security & Governance

| Service                        | Responsibility                                           |
| :----------------------------- | :------------------------------------------------------- |
| **`services/authz_svc`**       | Centralized Policy Decision Point (PDP).                 |
| **`services/authz-gateway`**   | Authorization enforcement gateway.                       |
| **`services/policy-enforcer`** | Sidecar for enforcing ABAC policies on data access.      |
| **`services/audit-log`**       | Immutable append-only log of all user actions.           |
| **`services/provenance`**      | Data lineage tracking (Source -> Observation -> Entity). |

## 🔄 Ingestion & ETL

| Service                            | Responsibility                       |
| :--------------------------------- | :----------------------------------- |
| **`services/ingest-orchestrator`** | Manages multi-stage ETL pipelines.   |
| **`services/feed-processor`**      | Normalizes external RSS/API feeds.   |
| **`services/file-storage-backup`** | Encrypted backup for evidence blobs. |

## 🏗️ Infrastructure & DevOps

| Service                      | Responsibility                                        |
| :--------------------------- | :---------------------------------------------------- |
| **`packages/maestro-core`**  | Workflow orchestration engine (Embedded in `server`). |
| **`services/feature-flags`** | Dynamic configuration service.                        |
| **`packages/observability`** | Telemetry clients (Prometheus/Loki/Jaeger).           |

_(Note: This is a summarized list. See `services/` directory for the full 150+ inventory.)_
