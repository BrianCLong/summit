# Intelgraph Roadmap & Architecture

## Product Roadmap

### Phase 1: Stabilize & Expand Core (0–3 Months)

| Feature/Initiative | Details |
| --- | --- |
| Graph & Entity Enhancements | Improve visual graph UX, add timeline view, support for multi-modal nodes. |
| Modular Data Ingestion Layer | Build modular ingestion pipeline (CSV, JSON, RSS, APIs, PDFs, social). |
| Basic Authentication & RBAC | OAuth2.0, roles for analyst/admin/view-only. |
| Structured Issue Tracking | Implement GitHub project board or Jira-based agile issue board. |

### Phase 2: Real-Time & Predictive Intelligence (3–9 Months)

| Feature/Initiative | Details |
| --- | --- |
| Real-Time Ingestion Engine | Kafka + Flink pipeline for live feeds from HUMINT, SIGINT, OSINT. |
| Alert & Anomaly Engine | Real-time rules engine + ML model for anomaly detection. |
| ML Forecasting Pipelines | Add Jupyter, MLflow for threat modeling (scikit-learn + PyTorch). |
| NLP Entity Resolution + Semantic Search | Use sentence transformers + vector search (e.g., Weaviate). |
| Analyst Dashboard | Role-specific UI with KPIs, recent alerts, open tasks, saved graphs. |

### Phase 3: Collaborative & Autonomous Intelligence (9–18 Months)

| Feature/Initiative | Details |
| --- | --- |
| Shared Workspaces | Analyst collaboration, annotation, shared timelines. |
| Automated Report Generation | Jinja + WeasyPrint or LLM summarization for exportable reports. |
| LLM Integration for Fusion Analysis | Use GPT-style model to summarize, suggest tags, and cross-correlate. |
| Workflow Automation | Airflow or temporal-based orchestration of ingest > analyze > alert. |
| Audit Logs + Compliance Layer | 28 CFR Part 23, CJIS audit logging, role-based logs. |

## Architecture Blueprint

```
                ┌───────────────────────────────┐
                │  External Intel Feeds         │
                │ (OSINT, SIGINT, APIs, etc.)   │
                └────────────┬──────────────────┘
                             │
                       ┌──────▼──────────┐
                       │ Kafka Ingest    │◄──────┐
                       │ Flink/StreamLit │       │ Real-Time
                       └──────┬──────────┘       │ Feeds
                             │                  │
                ┌────────────▼──────────────┐   │
                │  Unified Data Lake        │   │
                │ (S3/GCS + Parquet + Glue) │   │
                └────────────┬──────────────┘   │
                             │                  │
                ┌────────────▼─────────────┐    │
                │  Processing Layer        │    │
                │ (ML: PyTorch/Sklearn,    │    │
                │  NLP: HF Transformers,   │    │
                │  Search: Weaviate)       │    │
                └────────────┬─────────────┘    │
                             │                  │
           ┌──────────────────▼───────────────────┐
           │  Intelgraph Backend (FastAPI + ORM)  │
           └──────────────────┬───────────────────┘
                             │
               ┌──────────────▼───────────────┐
               │     Frontend (React + D3)    │
               │ Graphs, Dashboards, NLP, UI  │
               └──────────────┬──────────────┘
                             │
               ┌──────────────▼───────────────┐
               │  AuthN/AuthZ + Audit Layer   │
               │  OAuth2.0 + JWT + Logs       │
               └──────────────────────────────┘
```

## GitHub Issue Set

- FEATURE: Real-Time Ingestion Pipeline
- FEATURE: Predictive Threat Modeling Engine
- FEATURE: Semantic Search & Entity Resolution
- FEATURE: Analyst Dashboard
- FEATURE: Automated Report Generation
- SECURITY: OAuth2.0 + RBAC Implementation
- FEATURE: Shared Analyst Workspaces

