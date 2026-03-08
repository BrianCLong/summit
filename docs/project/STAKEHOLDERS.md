# Stakeholder Map & RACI Matrix

## Stakeholder Map

| Role | Description | Key Concerns |
|------|-------------|--------------|
| **Product Owner** | Defines vision, roadmap, and priorities. | Feature completeness, user value, timeline. |
| **Architect** | Defines system structure and technical standards. | Scalability, maintainability, consistency. |
| **Security Officer** | Ensures compliance and security posture. | Data privacy, auditability, access control. |
| **DevOps/SRE** | Manages infrastructure and reliability. | Uptime, deployment velocity, observability. |
| **Data Engineer** | Manages data models and pipelines. | Data integrity, schema evolution, throughput. |
| **Frontend Engineer** | Builds user interfaces. | UX/UI, accessibility, performance. |
| **AI/ML Engineer** | Develops intelligence features. | Model accuracy, latency, cost. |
| **Compliance Officer** | Ensures regulatory adherence. | Audit trails, data residency, GDPR/CCPA. |

## RACI Matrix

**R** = Responsible (Doer)
**A** = Accountable (Owner - *The Buck Stops Here*)
**C** = Consulted (Two-way comms)
**I** = Informed (One-way comms)

### Epics & Roles

| Epic | Owner (A) | Supporting (C/R) |
|------|-----------|------------------|
| **EP01: Backlog & Scope** | Product | Architecture, Security, Compliance, Cost, QA |
| **EP02: Architecture** | Architecture | Product, Security, Data, DevOps, SRE |
| **EP03: Data Modeling** | Data | Architecture, Security, Provenance, QA |
| **EP04: API Gateway** | API | Security, Data, DevOps, QA, SRE |
| **EP05: Ingestion** | Ingest | Data, Security, Provenance, DevOps, SRE |
| **EP06: Privacy & Security** | Security | Compliance, Data, API, DevOps |
| **EP07: Provenance** | Provenance | Security, Data, DevOps, SRE |
| **EP08: Frontend** | Frontend | Product, Data, Provenance, Security, QA |
| **EP09: AI/Analytics** | AI/Analytics | Data, Security, Product, SRE, Cost |
| **EP10: CI/CD & IaC** | DevOps | Security, SRE, QA, Architecture |
| **EP11: Observability** | SRE | DevOps, API, Ingest, Data, Security, Cost |

## Decision Owners

*   **Architecture Decisions**: Architecture Agent (consulting Security/Data/DevOps)
*   **Scope & Priority**: Product Agent
*   **Security & Policy**: Security Agent (consulting Compliance)
*   **Infrastructure & Cost**: DevOps/SRE Agents (consulting Cost)

## Communication Channels

*   **Status Updates**: `project_management/INTELGRAPH_MASTER_BACKLOG.md`
*   **Artifacts**: Git PRs and `docs/` directory.
*   **Alerts**: Defined SLO alerts (EP11).
