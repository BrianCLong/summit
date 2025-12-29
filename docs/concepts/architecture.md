---
title: Architecture Overview
summary: High-level system components, boundaries, and data flow.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Architecture Overview

The Summit platform is a monorepo containing a full-stack application centered around intelligence analysis and graph analytics.

## High-Level System Map

```mermaid
graph TD
    User[Analyst] --> Client[Web Client (React)]
    Client --> API[API Server (Node/Express/GraphQL)]
    API --> Auth[Auth Service]
    API --> GraphOps[Graph Ops Service]
    API --> Maestro[Maestro Orchestrator]

    GraphOps --> Neo4j[(Neo4j Graph DB)]
    Auth --> Postgres[(PostgreSQL)]
    Maestro --> Postgres

    API --> Redis[(Redis Cache/PubSub)]

    subgraph Data Layer
    Neo4j
    PostgreSQL
    Redis
    end
```

## Core Components

### 1. Web Client (`client/`)

- **Tech Stack**: React, Vite, Tailwind CSS, Apollo Client.
- **Role**: The primary user interface for analysts.
- **Key Features**:
  - Network Graph Visualization.
  - Timeline and Map Views.

### 2. API Server (`server/`)

- **Tech Stack**: Node.js, Express, Apollo Server (GraphQL).
- **Role**: The central API gateway and business logic layer.
- **Key Responsibilities**:
  - Authentication & Authorization.
  - GraphQL API resolution.
  - Orchestration of background tasks.

### 3. Data Layer

- **Neo4j**: Primary graph database for storing entities and relationships.
- **PostgreSQL**: Relational database for user data, audit logs, and structured records.
- **Redis**: Caching, session management, and Pub/Sub for real-time updates.

### 4. Background Processing

- **Maestro**: Orchestration engine for complex, multi-step workflows.
- **Queues**: BullMQ / PgBoss for asynchronous tasks.

## Domain Boundaries

- **Identity & Access**: Managed by `AuthService` (Postgres). See **[Security Model](security-model.md)**.
- **Graph Operations**: Handled by `GraphOpsService` and Neo4j. See **[Data Model](data-model.md)**.
- **Ingestion**: ETL pipelines handling external data sources.
- **Orchestration**: Maestro engine managing long-running processes. See **[AI & ML Architecture](ai-architecture.md)** for details on Copilot and Sim integration.
