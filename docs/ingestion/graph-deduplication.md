# Graph Data Deduplication

The graph deduplication tooling eliminates duplicate nodes and relationships in
Neo4j based on configurable attribute rules. It consists of:

- A Python deduplication script (`server/python/graph_deduplication.py`) that
  reads a JSON payload from `stdin`, searches for duplicate groups, and merges
  them using APOC refactor helpers while emitting a structured summary.
- A GraphQL mutation (`runGraphDeduplication`) that validates client input,
  spawns the Python script, and relays execution telemetry via OpenTelemetry.
- Pytest coverage for the orchestration logic (`server/python/tests`).

## Configuration Model

The mutation accepts a `GraphDeduplicationInput`:

```graphql
input NodeDeduplicationRuleInput {
  label: String!
  matchAttributes: [String!]!
}

input RelationshipDeduplicationRuleInput {
  type: String!
  matchAttributes: [String!]!
}

input GraphDeduplicationInput {
  nodeRules: [NodeDeduplicationRuleInput!]
  relationshipRules: [RelationshipDeduplicationRuleInput!]
  dryRun: Boolean = false
  database: String
  context: JSON
}
```

Rules describe which labels or relationship types should be deduplicated and
list the attributes that compose the deduplication key. Empty keys are skipped
so entities lacking the configured attributes are never merged.

The resolver converts this structure into the JSON document that the Python
script expects. Optional context metadata (tenant, user, request ID, etc.) is
forwarded for traceability.

## Running the Mutation

```graphql
mutation DeduplicateGraph($input: GraphDeduplicationInput!) {
  runGraphDeduplication(input: $input) {
    operationId
    dryRun
    mergedNodes
    mergedRelationships
    nodeSummary
    relationshipSummary
    logs
  }
}
```

Example variables:

```json
{
  "input": {
    "nodeRules": [
      { "label": "Person", "matchAttributes": ["externalId", "name"] }
    ],
    "relationshipRules": [
      { "type": "ASSOCIATED_WITH", "matchAttributes": ["sourceId"] }
    ],
    "dryRun": true
  }
}
```

When `dryRun` is `true`, the script reports duplicate groups without merging
records. For live merges set `dryRun` to `false` (default) and review the
`logs`, `nodeSummary`, and `relationshipSummary` payloads for auditing.

## Telemetry

- The resolver wraps execution in a span named `graph.runGraphDeduplication`.
- Key metrics recorded as span attributes include operation ID, whether the run
  was dry, how many node/relationship groups were found, and how many were
  merged.
- The Python script logs merge decisions which the resolver attaches as span
  events (first five entries) to simplify root cause analysis.

## Local Execution

The script can be exercised directly for debugging:

```bash
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=secret

python3 server/python/graph_deduplication.py <<'JSON'
{
  "node_rules": [
    { "label": "Person", "match_attributes": ["externalId"] }
  ],
  "dry_run": true
}
JSON
```

The command prints a JSON summary describing discovered duplicates.

## Testing

Unit tests are located in `server/python/tests/test_graph_deduplication.py` and
can be run with:

```bash
pytest server/python/tests -q
```

These tests mock the Neo4j driver to validate query construction, rule
normalization, and the dry-run/merge execution paths without requiring a live
Neo4j instance.
