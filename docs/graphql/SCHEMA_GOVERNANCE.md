# GraphQL Schema Governance and Evolution Guide

## Table of Contents

1. [Overview](#overview)
2. [Schema Versioning](#schema-versioning)
3. [Breaking vs Non-Breaking Changes](#breaking-vs-non-breaking-changes)
4. [Schema Validation Rules](#schema-validation-rules)
5. [Field-Level Authorization](#field-level-authorization)
6. [Query Complexity Management](#query-complexity-management)
7. [Performance Monitoring](#performance-monitoring)
8. [Federation Architecture](#federation-architecture)
9. [Deprecation Guidelines](#deprecation-guidelines)
10. [CI/CD Integration](#cicd-integration)
11. [Best Practices](#best-practices)

## Overview

This document outlines the governance policies and evolution guidelines for the IntelGraph GraphQL API. Following these guidelines ensures API stability, backward compatibility, and optimal performance.

### Goals

- **Zero Breaking Changes**: Maintain backward compatibility at all times
- **Comprehensive Validation**: Catch issues before they reach production
- **Performance Excellence**: Monitor and optimize query performance
- **Security First**: Enforce field-level authorization and rate limiting
- **Developer Experience**: Clear documentation and helpful tooling

## Schema Versioning

### Version Management

All schema changes are tracked through the Schema Registry located in `graphql/versions/`. Each version includes:

- Complete schema definition
- SHA-256 hash for integrity
- Changelog of modifications
- Author and timestamp
- Description of changes

### Registering a New Version

```typescript
import { schemaRegistry } from './graphql/schema-registry';

// Register new schema version
await schemaRegistry.registerSchema(
  schema,
  'v1.2.0',
  'developer@example.com',
  'Added entity filtering capabilities'
);
```

### Version Numbering

Follow semantic versioning:

- **Major (X.0.0)**: Breaking changes (requires approval)
- **Minor (1.X.0)**: New features, non-breaking
- **Patch (1.0.X)**: Bug fixes, documentation

## Breaking vs Non-Breaking Changes

### ✅ Non-Breaking Changes (Safe)

- Adding new types
- Adding new fields to types
- Adding new queries/mutations
- Adding new enum values
- Adding new input fields (optional)
- Making required fields optional
- Deprecating fields (with proper notice)
- Adding new arguments (optional)

### ⚠️ Breaking Changes (Requires Review)

- Removing types, fields, or arguments
- Renaming types or fields
- Changing field types
- Making optional fields required
- Removing enum values
- Changing argument types
- Modifying field return types

### Approval Process for Breaking Changes

1. Create RFC document explaining necessity
2. Get approval from API governance team
3. Plan migration strategy for clients
4. Provide at least 90-day deprecation notice
5. Update all affected documentation
6. Monitor usage during transition period

## Schema Validation Rules

### Automated Checks

Every schema change is automatically validated for:

#### 1. Naming Conventions

- **Types**: PascalCase (e.g., `UserProfile`, `EntityType`)
- **Fields**: camelCase (e.g., `firstName`, `createdAt`)
- **Enums**: UPPER_CASE (e.g., `ACTIVE`, `PENDING`)
- **Input Types**: Must end with `Input` (e.g., `CreateUserInput`)

#### 2. Anti-Patterns

Avoided patterns that trigger warnings:

- Generic field names (`data`, `info`, `value`)
- List fields without pagination
- Too many fields in a type (>50)
- Too many arguments on a field (>10)
- Deeply nested list types

#### 3. Deprecation Quality

All deprecations must include:

- Clear reason (minimum 10 characters)
- Migration path ("Use X instead")
- Optional removal date (YYYY-MM-DD)

Example:

```graphql
type User {
  id: ID!
  name: String! @deprecated(
    reason: "Use firstName and lastName instead. Will be removed on 2025-12-31."
  )
  firstName: String!
  lastName: String!
}
```

## Field-Level Authorization

### Using the @auth Directive

Protect fields with role-based and permission-based access control:

```graphql
type Query {
  # Requires authentication
  user(id: ID!): User @auth

  # Requires specific role
  adminPanel: AdminPanel @auth(roles: ["admin"])

  # Requires multiple roles (OR logic)
  moderatorTools: ModeratorTools @auth(roles: ["admin", "moderator"])

  # Requires specific permissions (AND logic)
  deleteUser(id: ID!): Boolean! @auth(permissions: ["delete:users"])

  # Requires ownership
  myProfile: User @auth(requireOwnership: true)
}
```

### Permission Hierarchy

```
admin
  ├── read:all
  ├── write:all
  ├── delete:all
  └── manage:*

analyst
  ├── read:investigations
  ├── write:investigations
  ├── read:entities
  └── write:entities

viewer
  ├── read:investigations
  ├── read:entities
  └── read:relationships

guest
  └── read:public
```

### Rate Limiting

Protect expensive operations:

```graphql
type Mutation {
  generateEntityInsights(entityId: ID!): EntityInsights!
    @auth
    @rateLimit(max: 10, window: 60, scope: USER)
    @budget(capUSD: 0.5, tokenCeiling: 1000)
}
```

## Query Complexity Management

### Complexity Limits

- **Default Max Complexity**: 1000 points
- **Default Max Depth**: 10 levels
- **List Multiplier**: 10x per list field

### Calculating Complexity

```
Query Complexity = Sum of:
  (Field Complexity + Child Complexity) × List Multiplier
```

### Custom Complexity Configuration

```typescript
import { defaultComplexityConfig } from './graphql/complexity-calculator';

// Define custom complexity for expensive fields
defaultComplexityConfig.customComplexity.set(
  'Query.semanticSearch',
  (args, childComplexity) => {
    const multiplier = args.fuzzy ? 2 : 1;
    return (10 + childComplexity) * multiplier;
  }
);
```

### Example Query Analysis

```graphql
query ComplexQuery {
  entities(limit: 50) {           # 50 × (1 + childComplexity)
    id
    type
    relationships(limit: 20) {    # 50 × 20 × (1 + childComplexity)
      id
      type
      to {
        id
        type
      }
    }
  }
}

# Total Complexity ≈ 1,100 points (exceeds limit!)
```

### Optimization Strategies

1. **Reduce List Limits**: Request fewer items
2. **Limit Depth**: Avoid deep nesting
3. **Use Pagination**: Implement cursor-based pagination
4. **Selective Fields**: Only request needed fields

## Performance Monitoring

### Metrics Tracked

- Resolver execution time
- N+1 query detection
- Query complexity scores
- Field usage statistics

### Accessing Performance Data

```typescript
import { globalPerformanceMonitor } from './graphql/performance-monitor';

// Get performance report
const report = globalPerformanceMonitor.generateReport();

// Check for N+1 queries
if (report.nPlusOneQueries.length > 0) {
  console.warn('N+1 queries detected:', report.nPlusOneQueries);
}
```

### DataLoader Integration

Prevent N+1 queries using DataLoader:

```typescript
import { createDataLoaderContext } from './graphql/performance-monitor';

const context = createDataLoaderContext({
  user: req.user,
  db: dbClient,
});

// In resolver
const entity = await context.loaders.entity.load(entityId);
```

### Performance Thresholds

- **Slow Resolver**: >100ms
- **Very Slow Resolver**: >500ms
- **N+1 Threshold**: ≥5 occurrences

## Federation Architecture

### Subgraph Structure

```
┌─────────────────────┐
│  Apollo Gateway     │  ← Unified API
└──────────┬──────────┘
           │
    ┌──────┴──────┬────────────┬─────────────┐
    │             │            │             │
┌───▼────┐  ┌────▼─────┐  ┌──▼──────┐  ┌───▼──────┐
│  Core  │  │ Entities │  │   AI    │  │  Invest  │
│Subgraph│  │ Subgraph │  │Subgraph │  │ Subgraph │
└────────┘  └──────────┘  └─────────┘  └──────────┘
```

### Creating a Subgraph

```typescript
import { createSubgraphSchema } from './graphql/federation/subgraph';

const schema = createSubgraphSchema(typeDefs, resolvers);
```

### Entity References

Use `@key` directive for federated entities:

```graphql
type Entity @key(fields: "id") {
  id: ID!
  type: String!
  # ... other fields
}
```

## Deprecation Guidelines

### Deprecation Process

1. **Announce**: Add @deprecated directive with clear reason
2. **Document**: Update API documentation
3. **Monitor**: Track usage of deprecated field
4. **Notify**: Email users of deprecated APIs
5. **Remove**: After 90 days minimum

### Deprecation Timeline

```
Day 0:   Add @deprecated directive
Day 30:  First notification to API users
Day 60:  Second notification
Day 90:  Final warning
Day 120: Remove deprecated field
```

### Example Deprecation

```graphql
type Entity {
  id: ID!

  # Old field (deprecated)
  data: JSON @deprecated(
    reason: "Use structured fields instead. The 'data' field will be removed on 2025-12-31. Migrate to using specific typed fields."
    removeBy: "2025-12-31"
    replaceWith: "Use specific typed fields based on entity type"
  )

  # New structured fields
  properties: EntityProperties!
}
```

## CI/CD Integration

### GitHub Actions Workflow

The CI pipeline automatically:

1. ✅ Validates schema syntax
2. ✅ Checks for breaking changes
3. ✅ Runs validation rules
4. ✅ Verifies naming conventions
5. ✅ Validates deprecations
6. ✅ Checks for anti-patterns
7. ✅ Generates complexity report
8. ✅ Creates changelog
9. ✅ Posts PR comment with results

### Running Locally

```bash
# Validate schema
pnpm run graphql:validate

# Check for breaking changes
pnpm run graphql:check

# Generate documentation
pnpm run graphql:docs

# Run complexity analysis
pnpm run graphql:complexity
```

## Best Practices

### 1. Design Principles

- **Client-Driven**: Design for client needs
- **Type Safety**: Use strong typing
- **Explicitness**: Clear, descriptive names
- **Consistency**: Follow established patterns
- **Documentation**: Document all types and fields

### 2. Field Design

```graphql
# ✅ Good: Specific, typed fields
type User {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  createdAt: DateTime!
}

# ❌ Bad: Generic, untyped fields
type User {
  id: ID!
  data: JSON!
}
```

### 3. Pagination

Always paginate list fields:

```graphql
type Query {
  # ✅ Good: Includes pagination
  entities(
    limit: Int = 25
    offset: Int = 0
  ): EntitiesConnection!

  # ❌ Bad: No pagination
  allEntities: [Entity!]!
}

type EntitiesConnection {
  nodes: [Entity!]!
  totalCount: Int!
  hasNextPage: Boolean!
}
```

### 4. Input Types

Group related arguments:

```graphql
# ✅ Good: Grouped input
type Mutation {
  createEntity(input: CreateEntityInput!): Entity!
}

input CreateEntityInput {
  type: String!
  properties: JSON!
  investigationId: ID!
}

# ❌ Bad: Many arguments
type Mutation {
  createEntity(
    type: String!
    properties: JSON!
    investigationId: ID!
    source: String
    confidence: Float
    # ... many more
  ): Entity!
}
```

### 5. Error Handling

Return proper errors:

```graphql
type Mutation {
  createEntity(input: CreateEntityInput!): CreateEntityPayload!
}

type CreateEntityPayload {
  entity: Entity
  errors: [UserError!]!
}

type UserError {
  message: String!
  field: String
  code: String!
}
```

### 6. Nullability

Be explicit about nullability:

```graphql
type Entity {
  id: ID!                    # Required
  type: String!              # Required
  description: String        # Optional
  tags: [String!]!           # Required list of required strings
  metadata: JSON             # Optional
}
```

### 7. Descriptions

Document everything:

```graphql
"""
An entity in the knowledge graph.
Entities represent people, organizations, locations, or other objects of interest.
"""
type Entity {
  """The unique identifier for this entity."""
  id: ID!

  """
  The entity type (e.g., Person, Organization, Location).
  Must match one of the predefined entity types.
  """
  type: String!
}
```

## Monitoring and Alerts

### Key Metrics

- **Schema Version**: Current active version
- **Breaking Changes**: Count per release
- **Deprecated Fields**: Usage over time
- **Query Complexity**: P95, P99
- **Slow Resolvers**: Count per hour
- **N+1 Queries**: Count per hour
- **Auth Failures**: Rate per minute

### Alert Thresholds

```yaml
alerts:
  - name: HighQueryComplexity
    condition: p95_complexity > 800
    severity: warning

  - name: NPlusOneDetected
    condition: n_plus_one_count > 10
    severity: critical

  - name: SlowResolvers
    condition: slow_resolver_count > 50
    severity: warning

  - name: BreakingChange
    condition: breaking_changes > 0
    severity: critical
```

## Support and Resources

### Documentation

- [API Documentation](./api-docs.md) - Auto-generated from schema
- [Query Examples](./examples/) - Sample queries and mutations
- [Migration Guides](./migrations/) - Version upgrade guides

### Tools

- **GraphQL Playground**: https://api.intelgraph.com/playground
- **Schema Explorer**: https://api.intelgraph.com/explorer
- **Performance Dashboard**: https://grafana.intelgraph.com/graphql

### Contact

- **API Team**: api-team@intelgraph.com
- **Slack Channel**: #graphql-api
- **Issue Tracker**: https://github.com/intelgraph/api/issues

---

**Last Updated**: 2025-01-20
**Version**: 1.0.0
**Maintained By**: API Governance Team
