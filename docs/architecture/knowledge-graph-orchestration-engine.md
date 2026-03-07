# Knowledge Graph Orchestration Engine

The graph context compiler transforms task requests into policy-trimmed execution context.

## Compiler pipeline

1. Bind task entities
2. Expand neighborhood from enterprise graph
3. Trim unauthorized edges with policy scope
4. Compact context for token budget
5. Emit typed package with evidence IDs

## Context package shape

- `entities`
- `subgraph`
- `allowedDatasets`
- `allowedTools`
- `evidenceIds`

## Safety

The compiler preserves uncertainty boundaries and returns only graph-supported context.
