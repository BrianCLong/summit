# Graph Query Correctness Oracle

> **Version**: 1.0.0
> **Last Updated**: 2025-12-06
> **Status**: Active

## Overview

The Graph Query Correctness Oracle is a testing framework that validates IntelGraph query semantics against a predefined set of "golden" scenarios. It ensures that graph query behavior remains consistent across code changes and catches regressions in graph semantics and performance.

## Purpose

- **Semantic Correctness**: Verify that graph queries return expected results
- **Regression Detection**: Catch changes that break expected query behavior
- **Performance Monitoring**: Track query execution times and detect degradation
- **Contract Testing**: Ensure API contracts are maintained across releases

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Graph Query Oracle                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Golden     │───>│   Oracle     │───>│   Report     │      │
│  │   Fixtures   │    │   Runner     │    │   Generator  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│        │                    │                    │               │
│        v                    v                    v               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Expected    │    │   GraphQL    │    │  Markdown    │      │
│  │  Results     │    │   API        │    │  Report      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Golden Dataset

The oracle uses the golden dataset from `data/golden-path/demo-investigation.json` as its foundation. This dataset contains:

### Entities

| Index | Type         | Name         | Key Properties                                |
| ----- | ------------ | ------------ | --------------------------------------------- |
| 0     | PERSON       | Avery Patel  | role: analyst, affiliation: Helios Trust      |
| 1     | ORGANIZATION | Helios Trust | sector: finance, risk_score: 62               |
| 2     | LOCATION     | Lisbon       | country: Portugal, lat: 38.7223, lng: -9.1393 |

### Relationships

| Type        | From             | To               | Properties         |
| ----------- | ---------------- | ---------------- | ------------------ |
| REPRESENTS  | Avery Patel (0)  | Helios Trust (1) | since: 2024-03-04  |
| OPERATES_IN | Helios Trust (1) | Lisbon (2)       | headquarters: true |

### Graph Structure

```
[Avery Patel] ──REPRESENTS──> [Helios Trust] ──OPERATES_IN──> [Lisbon]
   (Person)                    (Organization)                  (Location)
```

---

## Oracle Scenarios

### Category 1: Pathfinding Cases

#### Scenario 1.1: Direct Path - Person to Organization

**Description**: Find the shortest path from Avery Patel to Helios Trust.

**Expected Result**:

- Path length: 1
- Path: `[Avery Patel] -> [Helios Trust]`
- Relationship: REPRESENTS

**Validation**:

- Exact node count: 2
- Exact relationship count: 1
- Path order preserved

#### Scenario 1.2: Two-Hop Path - Person to Location

**Description**: Find the shortest path from Avery Patel to Lisbon.

**Expected Result**:

- Path length: 2
- Path: `[Avery Patel] -> [Helios Trust] -> [Lisbon]`
- Relationships: REPRESENTS, OPERATES_IN

**Validation**:

- Exact node count: 3
- Exact relationship count: 2
- Intermediate node is Helios Trust

#### Scenario 1.3: No Path Exists

**Description**: Query for a path between non-connected entities or non-existent IDs.

**Expected Result**:

- Path: null or empty
- No error thrown

**Validation**:

- Result is null/empty
- Query completes without error

#### Scenario 1.4: Same Source and Target

**Description**: Find path from an entity to itself.

**Expected Result**:

- Path length: 0
- Single node in path

**Validation**:

- Node count: 1
- Relationship count: 0

---

### Category 2: Neighborhood Queries

#### Scenario 2.1: Depth-1 Neighborhood

**Description**: Query the neighborhood of Helios Trust at depth 1.

**Expected Result**:

- Center: Helios Trust
- Depth 1: [Avery Patel, Lisbon]
- Total entities: 3
- Total relationships: 2

**Validation**:

- Entity count: 3
- Relationship count: 2
- All entity types present: Person, Organization, Location

#### Scenario 2.2: Filtered Neighborhood by Entity Type

**Description**: Query neighborhood of Helios Trust, filtered to Person type only.

**Expected Result**:

- Center: Helios Trust
- Depth 1: [Avery Patel]
- Total entities: 2

**Validation**:

- Only Person entities in results (besides center)
- Lisbon excluded from results

#### Scenario 2.3: Filtered Neighborhood by Relationship Type

**Description**: Query neighborhood filtering by REPRESENTS relationships.

**Expected Result**:

- Only relationships of type REPRESENTS returned

**Validation**:

- All relationships are REPRESENTS type
- OPERATES_IN relationships excluded

#### Scenario 2.4: Max Depth Enforcement

**Description**: Query neighborhood with depth = 5 (beyond graph size).

**Expected Result**:

- Returns entire reachable graph
- Does not exceed max depth limit

**Validation**:

- Result includes all 3 entities
- truncated flag is false

---

### Category 3: Entity Queries

#### Scenario 3.1: Get Entity by ID

**Description**: Retrieve an entity by its exact ID.

**Expected Result**:

- Returns the entity with matching properties
- All required fields populated

**Validation**:

- Entity ID matches query
- Entity type correct
- Label/name matches expected

#### Scenario 3.2: Entity Not Found

**Description**: Query for a non-existent entity ID.

**Expected Result**:

- Returns null
- No error thrown

**Validation**:

- Result is null
- No GraphQL errors

#### Scenario 3.3: List Entities by Type

**Description**: Query all entities of type Organization.

**Expected Result**:

- Returns array containing Helios Trust
- Pagination metadata correct

**Validation**:

- Count matches expected (1)
- All results are of type Organization

---

### Category 4: Relationship Queries

#### Scenario 4.1: Get Outgoing Relationships

**Description**: Get all outgoing relationships from Helios Trust.

**Expected Result**:

- Returns OPERATES_IN relationship to Lisbon

**Validation**:

- Source is Helios Trust
- Target is Lisbon
- Type is OPERATES_IN

#### Scenario 4.2: Get Incoming Relationships

**Description**: Get all incoming relationships to Helios Trust.

**Expected Result**:

- Returns REPRESENTS relationship from Avery Patel

**Validation**:

- Source is Avery Patel
- Target is Helios Trust
- Type is REPRESENTS

#### Scenario 4.3: Filter Relationships by Type

**Description**: Query relationships filtered by REPRESENTS type.

**Expected Result**:

- Only REPRESENTS relationships returned

**Validation**:

- All relationships are REPRESENTS type
- Count matches expected

---

### Category 5: Graph Statistics

#### Scenario 5.1: Store Statistics

**Description**: Query overall graph statistics.

**Expected Result**:

- Entity count: 3
- Relationship count: 2
- Entity types: Person(1), Organization(1), Location(1)
- Relationship types: REPRESENTS(1), OPERATES_IN(1)

**Validation**:

- Entity count >= 3
- Relationship count >= 2
- Type breakdown accurate

---

### Category 6: Centrality & Ranking (Extended Dataset)

> Note: These scenarios require an extended dataset with more nodes for meaningful centrality calculations.

#### Scenario 6.1: Degree Centrality

**Description**: Calculate degree centrality for all nodes.

**Expected Result**:

- Helios Trust has highest degree (2 connections)
- Avery Patel and Lisbon have degree 1 each

**Validation**:

- Results sorted by score descending
- Helios Trust ranked first
- Tolerance: exact ordering for same scores (alphabetical tiebreaker)

#### Scenario 6.2: Hub Node Identification

**Description**: Identify the most connected node.

**Expected Result**:

- Helios Trust identified as hub (degree = 2)

**Validation**:

- Top result is Helios Trust
- Score is 2

---

### Category 7: Edge Cases & Error Handling

#### Scenario 7.1: Invalid Entity Type Filter

**Description**: Query with an invalid entity type.

**Expected Result**:

- Empty result set or validation error

**Validation**:

- No runtime exception
- Appropriate error message if validation fails

#### Scenario 7.2: Negative Depth Parameter

**Description**: Query neighborhood with depth = -1.

**Expected Result**:

- Validation error or clamped to minimum (0 or 1)

**Validation**:

- No runtime exception
- Query handled gracefully

#### Scenario 7.3: Empty Graph Query

**Description**: Query on an empty tenant/graph.

**Expected Result**:

- Empty result sets
- No errors

**Validation**:

- Stats show 0 entities, 0 relationships
- Queries return empty arrays

---

## Validation Rules

### Exact Match Validation

For deterministic queries, results must match exactly:

```typescript
interface ExactMatchValidation {
  nodeIds: string[]; // Exact set of node IDs
  nodeCount: number; // Exact count
  relationshipCount: number; // Exact count
  pathOrder: string[]; // Ordered sequence
}
```

### Set Membership Validation

For non-deterministic results, validate set membership:

```typescript
interface SetValidation {
  mustInclude: string[]; // Required elements
  mustExclude: string[]; // Forbidden elements
  minCount: number; // Minimum cardinality
  maxCount: number; // Maximum cardinality
}
```

### Ordering Tolerance

For ranking queries where ties are possible:

```typescript
interface OrderingValidation {
  topK: number; // Check top K results
  tiebreaker: "alphabetical" | "id" | "any";
  scoreTolerance: number; // Float comparison epsilon
}
```

### Performance Thresholds

```typescript
interface PerformanceThresholds {
  maxLatencyMs: number; // Query timeout
  p95LatencyMs: number; // 95th percentile target
  p99LatencyMs: number; // 99th percentile target
}
```

Default thresholds:

- Simple queries: maxLatencyMs = 500
- Pathfinding: maxLatencyMs = 1000
- Neighborhood (depth 2): maxLatencyMs = 2000
- Full graph stats: maxLatencyMs = 1000

---

## Report Format

The oracle produces a markdown report with the following structure:

```markdown
# Graph Query Oracle Report

## Summary

- Total Scenarios: N
- Passed: X
- Failed: Y
- Skipped: Z
- Success Rate: X/N (%)

## Results by Category

### Pathfinding

| Scenario | Status | Latency (ms) | Details      |
| -------- | ------ | ------------ | ------------ |
| 1.1      | PASS   | 45           | -            |
| 1.2      | FAIL   | 67           | Missing node |

### Neighborhood

...

## Failures

### Scenario 1.2: Two-Hop Path

- Expected: 3 nodes
- Actual: 2 nodes
- Diff: Missing intermediate node "Helios Trust"

## Performance Summary

| Category     | Avg (ms) | P95 (ms) | P99 (ms) |
| ------------ | -------- | -------- | -------- |
| Pathfinding  | 52       | 89       | 120      |
| Neighborhood | 145      | 234      | 312      |

## Recommendations

- Review pathfinding logic for scenario 1.2
- Performance within thresholds
```

---

## Integration with CI/CD

The oracle runs as part of the CI pipeline:

1. **Trigger**: PRs touching graph-related code
2. **Setup**: Load golden dataset
3. **Execute**: Run all oracle scenarios
4. **Validate**: Check against expected results
5. **Report**: Generate markdown report
6. **Gate**: Fail PR if any correctness violation

### Path Triggers

```yaml
paths:
  - "services/graph-core/**"
  - "services/graph-api/**"
  - "services/graph-algos/**"
  - "packages/graph-*/**"
  - "server/src/services/Graph*"
  - "server/src/repos/*Repo.ts"
```

---

## Extending the Oracle

### Adding New Scenarios

1. Add scenario to `testdata/intelgraph/oracle-scenarios.json`
2. Define expected results with validation rules
3. Run oracle locally to verify
4. Commit changes

### Scenario Schema

```typescript
interface OracleScenario {
  id: string; // Unique identifier (e.g., "path-1.1")
  category: string; // Category name
  description: string; // Human-readable description
  setupRef: string; // Reference to fixture/dataset
  query: {
    type: "graphql" | "rest"; // Query type
    operation: string; // Query/mutation name
    variables: object; // Query variables
  };
  expected: {
    validation: ValidationRule[];
    performance?: PerformanceThresholds;
  };
}
```

---

## Troubleshooting

### Common Failures

1. **Missing entities**: Dataset not loaded properly
2. **Wrong cardinality**: Query logic changed
3. **Timeout**: Performance regression
4. **Connection error**: API not running

### Debug Mode

Run with verbose output:

```bash
pnpm run oracle:graph -- --verbose --scenario path-1.1
```

---

## Related Documentation

- [Testing Strategy](./README.md)
- [Smoke Tests](./smoke-tests-v2.7.md)
- [GraphQL Schema](../../services/graph-core/src/graphql/schema.graphql)
- [Golden Dataset](../../data/golden-path/demo-investigation.json)

---

## Maintenance

**Owner**: Platform Engineering
**Review Cadence**: Quarterly or when graph APIs change

### Changelog

- **2025-12-06**: Initial oracle specification
