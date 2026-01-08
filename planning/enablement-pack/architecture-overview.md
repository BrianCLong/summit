# Architecture Overview

The Summit platform is a monorepo containing a full-stack application centered around intelligence analysis and graph analytics.

## High-Level System Map

![System Architecture](./architecture-map.mmd)

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

- **Identity & Access**: Managed by `AuthService` (Postgres).
- **Graph Operations**: Handled by `GraphOpsService` and Neo4j.
- **Ingestion**: ETL pipelines handling external data sources.
- **Orchestration**: Maestro engine managing long-running processes.
