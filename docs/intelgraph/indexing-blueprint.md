# IntelGraph Indexing & Data Model Blueprint

## Executive Summary

This document provides a comprehensive inventory of current Neo4j indexes and constraints for IntelGraph, identifies critical gaps based on high-volume query patterns, and outlines a recommended strategy for future modeling and optimization.

## 1. Current State Inventory

### 1.1 Constraints (Uniqueness & Existence)

| Label           | Property   | Type   | Status   |
| --------------- | ---------- | ------ | -------- |
| `Entity`        | `id`       | UNIQUE | Existing |
| `Entity`        | `tenantId` | EXISTS | Existing |
| `Entity`        | `type`     | EXISTS | Existing |
| `Entity`        | `label`    | EXISTS | Existing |
| `User`          | `id`       | UNIQUE | Existing |
| `User`          | `email`    | UNIQUE | Existing |
| `User`          | `username` | UNIQUE | Existing |
| `Investigation` | `id`       | UNIQUE | Existing |
| `RELATIONSHIP`  | `id`       | UNIQUE | Existing |

### 1.2 Indexes (Performance)

| Label/Type     | Property          | Type   | Notes                                                                                                                   |
| -------------- | ----------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `Entity`       | `tenantId`        | Single | High utility for multi-tenancy                                                                                          |
| `Entity`       | `investigationId` | Single | **MISMATCH WARNING**: Code uses `investigationId` (camelCase) but analytics queries use `investigation_id` (snake_case) |
| `Entity`       | `createdAt`       | Range  | Useful for timeline filtering                                                                                           |
| `Entity`       | `updatedAt`       | Single |                                                                                                                         |
| `Entity`       | `type`            | Single |                                                                                                                         |
| `Entity`       | `confidence`      | Range  |                                                                                                                         |
| `RELATIONSHIP` | `type`            | Single |                                                                                                                         |
| `RELATIONSHIP` | `investigationId` | Single | **MISMATCH WARNING**                                                                                                    |
| `RELATIONSHIP` | `createdAt`       | Single |                                                                                                                         |

### 1.3 Fulltext Indexes

- `entity_search_idx`: `Entity(label, description)`
- `investigation_search_idx`: `Investigation(title, description)`

## 2. Identified Gaps & Hot Paths

### 2.1 The "Snake-Case Mismatch"

**Critical Finding**: The `GraphAnalyticsService` heavily relies on `investigation_id` (snake_case) for partitioning data in algorithms (Centrality, PageRank, etc.), but the existing indexes are on `investigationId` (camelCase).

- **Impact**: Analytical queries are likely performing full node scans when filtering by investigation, severely impacting performance on large graphs.
- **Remediation**: Add indexes for `investigation_id` to support existing code.

### 2.2 Generic "Entity" Label Overload

**Observation**: Almost all nodes are labeled `Entity`. While convenient for generic traversal, it forces the query planner to check property filters for every node in the database if not combined with more specific labels.

- **Recommendation**: Use specific labels (`Person`, `Organization`, `Device`) in `MATCH` clauses whenever possible.

### 2.3 Missing Relationship Indexes

**Observation**: Queries often filter relationships by `investigation_id` (e.g., `GraphAnalyticsService.analyzeRelationshipPatterns`).

- **Remediation**: Add index on `RELATIONSHIP(investigation_id)`.

### 2.4 Unindexed Common Filters

**Observation**: `GraphStore` and other services filter by `label` string property.

- **Remediation**: Add index on `Entity(label)`.

## 3. Recommended Indexing Strategy (Blueprint)

### 3.1 Naming Convention

- **Standard**: Use **camelCase** for node properties (`investigationId`) to match the TypeScript application layer.
- **Legacy Support**: Maintain **snake_case** support (`investigation_id`) only where external services (Python/Analytics) strictly require it, but prefer migrating code to camelCase.

### 3.2 Tiered Indexing

1.  **Primary Keys & Tenant Isolation**: Must be unique and indexed.
    - `Entity(id)`, `Entity(tenantId)`
2.  **Partition Keys**: Used for graph slices (e.g., Investigation, Project).
    - `Entity(investigationId)` AND `Entity(investigation_id)` (until standardized).
3.  **Type Discriminators**:
    - `Entity(type)` (e.g., "person", "vehicle").
4.  **Temporal & Confidence**:
    - Range indexes on `createdAt`, `confidence`.

### 3.3 "Do's and Don'ts"

- **DO** use specific labels in queries (e.g., `MATCH (p:Person)` instead of `MATCH (n:Entity {type: 'Person'})`).
- **DO** parameterize all literals in Cypher queries to allow query plan caching.
- **DON'T** create indexes on high-cardinality text fields (use Fulltext indexes instead).
- **DON'T** rely on generic `Entity` label for global queries in a multi-tenant environment without a `tenantId` filter.

## 4. Migration Plan (Phase 1)

1.  Add indexes for `investigation_id` (snake_case) on `Entity` and `RELATIONSHIP`.
2.  Add index for `Entity(label)`.
3.  Ensure `Entity(tenantId)` is robust.
