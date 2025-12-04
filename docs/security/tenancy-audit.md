# Tenancy and RBAC Audit

## Overview
This document captures the findings of a security audit regarding multi-tenant isolation and Role-Based Access Control (RBAC) in the Summit server application. The goal is to ensure strong isolation between tenants and proper gating of privileged operations.

## Current Implementation

### Authentication & Context
- **Middleware**: `server/src/middleware/auth.ts` validates JWTs and populates `req.user`.
- **GraphQL Context**: `server/src/graphql/apollo-v5-server.ts` correctly extracts `tenantId` from `req.user` and populates `context.user.tenantId`.
- **Tenancy Enforcement**: `server/src/middleware/withTenant.ts` provides a higher-order function to wrap resolvers, ensuring `tenantId` is present and injecting it into arguments.

### Database Layer
- **PostgreSQL**:
    - Connection pooling is managed by `server/src/db/postgres.ts` but is tenant-agnostic.
    - Repositories (e.g., `CaseRepo`, `EntityRepo`) are responsible for appending `WHERE tenant_id = $1` to queries.
    - **Finding**: `EntityRepo` and `CaseRepo` implement this correctly.
- **Neo4j**:
    - Managed by `server/src/db/neo4j.ts`.
    - Nodes are decorated with `tenantId` properties (confirmed in `EntityRepo`).
    - **Gap**: The `neo.run` helper function accepts a context with `tenantId` but **ignores it**, failing to automatically enforce tenancy at the driver wrapper level.
    - **Gap**: `GraphRAGService` queries rely heavily on `investigationId` for scoping but do not explicitly filter by `tenantId` in Cypher queries, effectively relying on ID uniqueness rather than explicit isolation.

### Services & Logic
- **IntelGraph / GraphRAG**:
    - `GraphRAGQueryService` (Postgres queries) filters by `investigationId` properties in JSONB but misses explicit `tenant_id` column checks in `enrichCitations`.
    - `GraphRAGService` (Neo4j queries) misses explicit `tenantId` constraints in `MATCH` clauses.
- **Repositories**:
    - Most standard CRUD repositories (`CaseRepo`, `EntityRepo`) appear to handle tenancy correctly by requiring `tenantId` in method signatures and SQL queries.

## Gaps & Remediation Plan

### 1. Neo4j Driver Wrapper (`server/src/db/neo4j.ts`)
- **Issue**: The `neo.run` utility ignores the passed `tenantId`.
- **Fix**: Modify `neo.run` to prepend/inject a `tenantId` check if provided in the context.

### 2. GraphRAG Service (`server/src/services/GraphRAGService.ts`)
- **Issue**: Cypher queries in `retrieveSubgraph` only match on `investigationId`.
- **Fix**:
    - Update `GraphRAGRequest` schema to include `tenantId`.
    - Update Cypher queries to `MATCH (n:Entity {investigationId: $investigationId, tenantId: $tenantId})`.
    - Include `tenantId` in cache keys to prevent namespace collisions.

### 3. GraphRAG Query Service (`server/src/services/GraphRAGQueryService.ts`)
- **Issue**: `enrichCitations` queries `entities` table without checking the `tenant_id` column.
- **Fix**: Update SQL query to include `AND tenant_id = $tenantId`.

### 4. RBAC
- **Issue**: While `ensurePermission` middleware exists, its usage in complex services like GraphRAG is implicit.
- **Fix**: Ensure that the entry points (resolvers/routes) for these services explicitly check for required roles/permissions before dispatching to the service.

## Conclusion
The application has a solid foundation for tenancy (tenant-aware repositories, context propagation), but lacks "defense in depth" in the graph retrieval layer (GraphRAG) and the Neo4j utility wrapper. Strengthening these areas will ensure that knowledge graph access is strictly isolated.
