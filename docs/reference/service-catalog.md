---
title: Service Catalog
summary: Exhaustive inventory of microservices and their responsibilities.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Service Catalog

Summit is composed of **150+ microservices** organized into functional domains. This catalog provides a high-level inventory.

## 🟢 Core Platform (The Golden Path)

| Service              | Responsibility                                              | Port | Stack        |
| :------------------- | :---------------------------------------------------------- | :--- | :----------- |
| **`api` / `server`** | **Central Gateway**. GraphQL/REST API, Auth, Orchestration. | 4000 | Node/Express |
| **`client`**         | **Frontend**. React/Vite SPA for analysts.                  | 3000 | React        |
| **`gateway`**        | **Edge Router**. Ingress, Load Balancing, WAF.              | 4100 | Nginx/Node   |

## 🧠 AI & Intelligence Domain

| Service               | Responsibility                                                  |
| :-------------------- | :-------------------------------------------------------------- |
| **`ai-copilot`**      | LLM integration for natural language queries and summarization. |
| **`ai-nlq`**          | Natural Language to Query (Cypher/SQL) transpiler.              |
| **`ocr`**             | Optical Character Recognition for document ingestion.           |
| **`computer-vision`** | Object detection (YOLO) and face recognition (MTCNN).           |
| **`narrative-sim`**   | "EvoSim" engine for threat evolution and what-if scenarios.     |

## 📊 Data & Analytics Domain

| Service                  | Responsibility                                               |
| :----------------------- | :----------------------------------------------------------- |
| **`graph-ops`**          | Low-level Neo4j operations and maintenance.                  |
| **`analytics-engine`**   | Batch processing for graph algorithms (PageRank, Community). |
| **`timeseries-metrics`** | High-volume metric ingestion (TimescaleDB).                  |
| **`search-engine`**      | Full-text and vector search (Elasticsearch/Postgres).        |

## 🛡️ Security & Governance

| Service               | Responsibility                                           |
| :-------------------- | :------------------------------------------------------- |
| **`authz-core`**      | Centralized Policy Decision Point (PDP) using OPA.       |
| **`policy-enforcer`** | Sidecar for enforcing ABAC policies on data access.      |
| **`audit-log`**       | Immutable append-only log of all user actions.           |
| **`provenance`**      | Data lineage tracking (Source -> Observation -> Entity). |

## 🔄 Ingestion & ETL

| Service                   | Responsibility                       |
| :------------------------ | :----------------------------------- |
| **`ingest-orchestrator`** | Manages multi-stage ETL pipelines.   |
| **`feed-processor`**      | Normalizes external RSS/API feeds.   |
| **`file-storage-backup`** | Encrypted backup for evidence blobs. |

## 🏗️ Infrastructure & DevOps

| Service             | Responsibility                                  |
| :------------------ | :---------------------------------------------- |
| **`maestro`**       | Workflow orchestration engine (The "Brain").    |
| **`feature-flags`** | Dynamic configuration service.                  |
| **`observability`** | Telemetry aggregation (Prometheus/Loki/Jaeger). |

_(Note: This is a summarized list. See `services/` directory for the full 150+ inventory.)_
