# Multi-Tenant Isolation Verification Policy

## Overview

This document outlines the policies and mechanisms for ensuring tenant isolation within the IntelGraph platform. All data access must be strictly scoped to the authenticated tenant.

## Policy Rules

1.  **Database Schema**:
    - All tables containing tenant-specific data must include a `tenant_id` column (UUID or String).
    - `tenant_id` must be non-nullable for sensitive domains.
    - Global tables (e.g., system configuration, public reference data) are exempt but must be explicitly documented.

2.  **Data Access (SQL)**:
    - All SQL queries (SELECT, UPDATE, DELETE) targeting tenant-specific tables must include a `WHERE tenant_id = $1` clause (or equivalent parameter).
    - Insert statements must populate `tenant_id` from the authenticated context.
    - Usage of raw SQL without tenant filters is prohibited in sensitive domains.

3.  **Data Access (Graph/Neo4j)**:
    - All Cypher queries must include `WHERE n.tenantId = $tenantId` (or similar for relationships/other nodes).
    - Nodes created must have a `tenantId` property.

4.  **GraphQL Resolvers**:
    - All resolvers accessing tenant data must be wrapped with the `withTenant` middleware.
    - Resolvers must use `context.user.tenant` (or `args.tenantId` injected by middleware) for data fetching.

5.  **API Endpoints**:
    - REST endpoints must derive `tenantId` from `req.user` (populated by `ensureAuthenticated`).
    - Explicitly passing `tenantId` as a URL parameter or body field is forbidden unless validated against the authenticated user's token.

## Sensitive Domains

The following domains are considered strictly tenant-scoped:

- **Identity**: Users, Roles, Permissions
- **Audit**: Audit Logs, Activity History
- **Operations**: Runs, Pipelines, Executors, Jobs
- **Intelligence**: IntelGraph Nodes, Edges, Reports, Cases
- **Billing**: Subscriptions, Invoices, Usage Data

## Global Data (Exemptions)

- `system_config`
- `feature_flags` (global definitions)
- `public_datasets`

## Verification Tooling

### Static Analysis

A static analysis tool (`scripts/security/scan-tenant-isolation.ts`) scans the codebase for:

- SQL queries missing `tenant_id`.
- Cypher queries missing `tenantId`.
- GraphQL resolvers missing `withTenant`.

### Dynamic Verification

A dynamic verifier (`scripts/security/verify-tenant-isolation.ts`) runs during CI to:

- Seed multi-tenant data.
- Attempt cross-tenant access.
- Verify isolation enforcement.

## Compliance

New features must include tenant isolation tests. Violations detected by the scanner must be resolved before merging.
