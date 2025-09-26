# Graph Query Debugger

The Graph Query Debugger helps analysts and engineers understand how high-level GraphQL operations translate into Neo4j Cypher,
what the database plans to do with those statements, and which optimizations will have the biggest impact. The feature combines
backend instrumentation with a focused UI so you can iterate on graph workloads before promoting them to production.

## Key capabilities

- **GraphQL → Cypher translation** – Submit any read query that targets the graph API and preview the generated Cypher statement
  along with the resolved parameters.
- **Execution plan visibility** – Neo4j `EXPLAIN` output is normalized into a tree that highlights each operator and the order in
  which it will execute.
- **Optimization guidance** – The query optimizer evaluates the Cypher and surfaces index hints, rewrites, and execution tips with
  impact levels.
- **Inline diagnostics** – GraphQL syntax issues, unsupported fields, and plan errors appear inline with actionable hints so you
  can correct them quickly.

## Backend API

The API is exposed through the `graphQueryDebug` GraphQL query. It accepts the GraphQL document you want to analyze along with
optional variables and tenant context.

```graphql
query DebugCypher($tenantId: String!, $investigationId: ID!) {
  graphQueryDebug(
    input: {
      graphql: "query($investigationId: ID!) { graphData(investigationId: $investigationId) { nodeCount edgeCount } }"
      variables: { investigationId: $investigationId }
      tenantId: $tenantId
    }
  ) {
    cypher
    plan
    planSummary
    metrics {
      estimatedCost
      nodeCount
      relationshipCount
    }
    suggestions {
      title
      detail
      level
    }
    errors {
      stage
      message
      hint
    }
  }
}
```

Responses include the generated Cypher, the Neo4j plan tree (as JSON), optimization metrics, and any diagnostics collected during
parsing, translation, planning, or optimization.

## Frontend workflow

Navigate to **Graph Debugger** in the Summit navigation menu (or go directly to `/graph/debug`). The page provides:

1. **GraphQL editor** – Paste the query you want to inspect; optional variables and tenant ID can be supplied in adjacent inputs.
2. **Cypher preview** – Review the generated Cypher with syntax highlighting-like formatting.
3. **Metrics and hints** – View estimated cost, complexity, node and relationship counts, and required index suggestions.
4. **Execution plan** – Expandable tree that mirrors Neo4j operators so you can reason about traversal strategy and identify
   hotspots before executing the query in production.

Errors render inline with severity coloring and contextual hints so you can fix issues without leaving the page.

## When to use it

- Tuning graph workbench queries before deploying to analysts.
- Validating that new predicates take advantage of available indexes.
- Comparing alternate GraphQL shapes to see which produces the most efficient Cypher.
- Triaging production incidents where graph calls are unexpectedly slow.

Because the debugger runs queries in `EXPLAIN` mode it is safe to use against production data—it never mutates graph state. For
writes or destructive operations, run the Cypher manually after confirming the plan.
