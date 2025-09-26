# Graph Ingestion Validation Framework

This document describes the validation pipeline that must be executed before Neo4j ingestion. The framework combines JSON Schema checks, custom Cypher rule execution, and OpenTelemetry instrumentation so that invalid payloads are surfaced to operators and observability backends before any writes occur.

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| JSON Schema validator | `server/src/graph/validation/GraphValidationService.ts` | Enforces structural and property requirements for nodes and relationships. |
| Cypher rule catalog | `server/src/graph/validation/cypherRules.ts` | Runs rule-oriented Cypher snippets against the payload (using `UNWIND`) to detect disallowed patterns prior to ingestion. |
| GraphQL mutation | `server/src/graphql/schema.graph-validation.ts`, `server/src/graphql/resolvers/graphValidation.ts` | Provides an API for callers to preflight graph data. |
| Neo4j constraints | `server/db/migrations/neo4j/2025-10-05_graph_validation_rules.cypher` | Hardens the database so server-side constraints mirror the application policy. |
| Tests | `server/src/tests/GraphValidationService.test.ts`, `server/src/graphql/resolvers/__tests__/graphValidation.test.ts` | Guardrail coverage for the validator and resolver. |

## JSON Schema coverage

The validator ships with embedded JSON Schema definitions for the ingestion payload:

```ts
const nodeSchema = {
  type: 'object',
  required: ['id', 'labels', 'properties'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', minLength: 1 },
    labels: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
    properties: { type: 'object', additionalProperties: true }
  }
};
```

The service executes a lightweight schema walker that supports the subset of JSON Schema features we rely on (type checking, `required`, `minLength`, `pattern`, and `additionalProperties`). JSON Schema violations are returned with `code=SCHEMA_VALIDATION_FAILED` (or more specific codes for type and enum mismatches) and surfaced via OpenTelemetry events on the `graph.validation` span.

## Cypher rule execution

`GraphValidationService` can evaluate arbitrary Cypher rules before ingesting. The default rules live in `server/src/graph/validation/cypherRules.ts` and currently cover:

* Ensuring node `tenantId` matches the payload tenant.
* Restricting relationship types to the allow list (`ASSOCIATED_WITH`, `MENTIONS`, `COMMUNICATED_WITH`, `LOCATED_AT`).
* Verifying every relationship endpoint exists in the submitted node set.

Rules are executed with parameters derived from the payload, for example:

```cypher
UNWIND $relationships AS rel
WITH rel
WHERE NOT rel.type IN $allowedRelationshipTypes
RETURN collect({
  id: coalesce(rel.id, rel.sourceId + '->' + rel.targetId),
  type: rel.type,
  sourceId: rel.sourceId,
  targetId: rel.targetId
}) AS violations
```

Each rule contributes its own `GraphValidationError` objects when violations are returned. Execution failures are downgraded to warnings so ingestion clients receive actionable feedback instead of 500s.

## GraphQL mutation

Extend your GraphQL client with the `validateGraphData` mutation:

```graphql
mutation ValidateGraph($input: GraphValidationInput!) {
  validateGraphData(input: $input) {
    valid
    warnings
    appliedRules
    errors {
      code
      message
      path
      rule
      severity
    }
  }
}
```

Example variables:

```json
{
  "input": {
    "tenantId": "tenant-1",
    "nodes": [
      {
        "id": "node-1",
        "labels": ["Entity"],
        "properties": {
          "tenantId": "tenant-1",
          "kind": "PERSON",
          "name": "Alice"
        }
      }
    ],
    "relationships": []
  }
}
```

The resolver enforces tenant isolation through `TenantValidator` and attaches validation telemetry via the OpenTelemetry tracer (`graph-validation`).

## Telemetry

Every validation request is wrapped in a span named `graph.validation` with the following events:

* `graph.validation.rule` – emitted for each rule with the violation count.
* `graph.validation.error` – emitted per error with code, path, and rule metadata.
* `graph.validation.warning` – emitted when rule execution is skipped or degraded.
* Span status set to `ERROR` when any validation errors are present.

These signals let dashboards and alerts detect ingestion problems before data is persisted.

## Database constraints

The Cypher script `2025-10-05_graph_validation_rules.cypher` installs property existence constraints so the same invariants are enforced inside Neo4j. Run the script after deploying the application:

```bash
cypher-shell -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" \
  -f server/db/migrations/neo4j/2025-10-05_graph_validation_rules.cypher
```

The script also includes a helper query to surface any relationship types that fall outside the application allow list. Update the allow list in both the script and `GraphValidationService` when onboarding new relationship semantics.

## Test coverage

Run the focused test suites from the repository root:

```bash
cd server
npm test -- GraphValidationService
npm test -- graphValidationResolvers
```

The first suite exercises schema and Cypher-based rule enforcement; the second verifies the GraphQL entry point and tenant guardrail logic.
