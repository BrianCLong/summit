---
id: graphql-schema-change
name: GraphQL Schema Change Template
version: 1.0.0
category: specialized
type: graphql-schema
description: Structured approach to making GraphQL schema changes safely
author: IntelGraph Team
lastUpdated: 2025-11-27T00:00:00Z
tags:
  - graphql
  - schema
  - api
  - breaking-changes
metadata:
  priority: P2
  estimatedTokens: 1800
  complexity: moderate
variables:
  - name: changeDescription
    type: string
    description: Description of the schema change
    required: true
    prompt: "Describe the schema change:"
  - name: changeType
    type: string
    description: Type of change
    default: addition
    validation:
      enum: [addition, modification, deprecation, removal]
    prompt: "Change type (addition/modification/deprecation/removal)?"
  - name: affectedTypes
    type: string
    description: Affected GraphQL types
    required: true
    prompt: "Affected types? (e.g., 'User, Investigation')"
  - name: isBreaking
    type: boolean
    description: Is this a breaking change
    default: false
    prompt: "Is this a breaking change? (true/false)"
  - name: backwardCompatible
    type: boolean
    description: Is this backward compatible
    default: true
    prompt: "Backward compatible? (true/false)"
---
# 🔷 GraphQL Schema Change — Safe API Evolution

## Role

You are a senior backend engineer specializing in GraphQL API design. Your task is to implement a {{changeType}} to the GraphQL schema that is {{#if backwardCompatible}}backward compatible{{else}}properly versioned and communicated{{/if}}.

---

## 1. Change Request

### Description
{{changeDescription}}

### Details
* **Change Type**: {{changeType}}
* **Affected Types**: {{affectedTypes}}
* **Breaking Change**: {{isBreaking}}
* **Backward Compatible**: {{backwardCompatible}}

---

## 2. GraphQL Schema Change Guidelines

### Breaking vs Non-Breaking Changes

**Non-Breaking (Safe)**:
* Adding new types
* Adding new fields to types
* Adding new queries/mutations
* Adding new arguments with defaults
* Adding values to enums
* Making required fields optional

**Breaking (Requires Versioning)**:
* Removing types, fields, queries, mutations
* Removing enum values
* Changing field types
* Making optional fields required
* Removing arguments
* Changing argument types

---

## 3. Implementation Steps

### Step 1: Schema Design

1. **Update schema definition**
   * Location: `packages/graphql/schema.graphql` or service-specific schema
   * Follow GraphQL best practices
   * Use proper naming conventions (PascalCase for types, camelCase for fields)

2. **Check for breaking changes**
   ```bash
   pnpm graphql:schema:check
   ```

3. **Document the change**
   * Add comments to schema
   * Update API documentation

### Step 2: Resolver Implementation

1. **Implement resolvers**
   * Location: `services/api/src/resolvers/` or appropriate service
   * Handle all edge cases (null, empty, errors)
   * Apply proper authorization checks
   * Add input validation

2. **Data loader optimization** (if needed)
   * Prevent N+1 queries
   * Batch and cache data loading
   * Use DataLoader pattern

3. **Error handling**
   * Use proper GraphQL errors
   * Mask sensitive information
   * Provide helpful error messages

### Step 3: Type Generation

1. **Generate TypeScript types**
   ```bash
   pnpm graphql:codegen
   ```

2. **Update type imports**
   * In resolvers
   * In services
   * In client code

### Step 4: Testing

1. **Unit tests**
   * Test resolvers with various inputs
   * Test error cases
   * Test authorization

2. **Integration tests**
   * Test full query/mutation flow
   * Test with database
   * Test with authentication

3. **Schema validation tests**
   * Schema compiles
   * No breaking changes (unless intended)
   * Follows schema conventions

### Step 5: Client Updates

1. **Update persisted queries** (if using)
   ```bash
   pnpm persisted:build
   pnpm persisted:check
   ```

2. **Update client queries/mutations**
   * Add/update GraphQL documents
   * Regenerate client types
   * Update components using the API

### Step 6: Documentation

1. **API documentation**
   * Update GraphQL documentation
   * Add examples
   * Document edge cases

2. **Migration guide** (if breaking)
   * Document old vs new API
   * Provide migration steps
   * Set deprecation timeline

---

## 4. Deliverables

### A. Schema Changes

1. **Updated schema file(s)**
   * Full schema with changes
   * Comments explaining new/changed fields
   * Deprecation notices (if applicable)

2. **Breaking change analysis**
   * List of breaking changes
   * Impact assessment
   * Migration strategy

### B. Resolver Implementation

1. **Resolver code**
   * New/updated resolvers
   * Data loaders (if needed)
   * Input validation
   * Authorization checks

2. **Service layer** (if needed)
   * Business logic
   * Database queries
   * External API calls

### C. Test Suite

1. **Resolver tests**
   * Happy path
   * Error cases
   * Edge cases
   * Authorization tests

2. **Integration tests**
   * End-to-end query/mutation tests
   * Database integration tests

### D. Client Updates

1. **Query/mutation updates**
   * GraphQL documents
   * Client code changes
   * Type regeneration

2. **Component updates** (if needed)
   * React components using the API
   * Apollo Client cache updates

### E. Documentation

1. **API docs**
   * Schema documentation
   * Query/mutation examples
   * Error documentation

2. **Migration guide** (if breaking)
   * Deprecation timeline
   * Migration steps
   * Example before/after code

---

## 5. Verification Checklist

* [ ] Schema compiles without errors
* [ ] No unintended breaking changes
* [ ] GraphQL schema check passes (`pnpm graphql:schema:check`)
* [ ] TypeScript types generated (`pnpm graphql:codegen`)
* [ ] Persisted queries updated (if applicable)
* [ ] All resolver tests pass
* [ ] Integration tests pass
* [ ] Authorization properly enforced
* [ ] Input validation in place
* [ ] Error handling comprehensive
* [ ] N+1 queries prevented
* [ ] Documentation updated
* [ ] Migration guide written (if breaking)
* [ ] All tests pass (`pnpm test`)
* [ ] Smoke tests pass (`make smoke`)

---

## 6. Output Format

Structure your response as:

1. **Schema Analysis** (changes, breaking/non-breaking, impact)
2. **Schema Changes** (updated .graphql files)
3. **Resolver Implementation** (resolvers, services, data loaders)
4. **Test Suite** (unit tests, integration tests)
5. **Client Updates** (queries, mutations, components)
6. **Documentation** (API docs, migration guide if breaking)
7. **Verification Checklist** (with confirmations)

---

**Remember**: GraphQL schema is a contract. Treat breaking changes seriously! 🔷
