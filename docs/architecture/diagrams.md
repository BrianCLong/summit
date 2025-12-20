---
id: diagrams
title: Architecture Diagrams
sidebar_position: 1
---

# Architecture Diagrams

This section contains C4 model diagrams and other architectural views of the Summit platform.

## Context Diagram (C4)

```mermaid
C4Context
  title System Context Diagram for Summit Platform

  Person(analyst, "Intelligence Analyst", "A user who analyzes intelligence data.")
  System(summit, "Summit Platform", "AI-augmented graph analytics platform.")

  System_Ext(auth_provider, "Identity Provider", "SSO/OIDC Provider")
  System_Ext(data_sources, "Data Sources", "External intelligence feeds (OSINT, etc.)")

  Rel(analyst, summit, "Uses")
  Rel(summit, auth_provider, "Authenticates users using")
  Rel(summit, data_sources, "Ingests data from")
```

## Container Diagram (Simplified)

```mermaid
graph TD
    Client[Web Client (React)] -->|GraphQL| API[API Gateway (Node.js)]
    API -->|Auth| OPA[OPA Policy Engine]
    API -->|Read/Write| Neo4j[(Neo4j Graph DB)]
    API -->|Read/Write| Postgres[(PostgreSQL DB)]
    API -->|Job Queue| Redis[(Redis)]
    Redis --> Worker[Background Worker]
    Worker -->|Ingest| Neo4j
```

## Deployment View

```mermaid
graph LR
    subgraph "Production Cluster"
        LB[Load Balancer]
        subgraph "Services"
            API_Replica1[API Pod 1]
            API_Replica2[API Pod 2]
        end
        DB[(Managed DB)]
    end
    Internet --> LB
    LB --> Services
    Services --> DB
```
