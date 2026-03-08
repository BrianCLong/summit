# 0007-schema-ownership

## Status
Proposed

## Context
We operate dual data stores (Postgres + Neo4j) with GraphQL as the external contract. Without clear schema ownership, changes risk breaking downstream consumers and eroding SLO commitments.

## Decision
Institute a **domain schema ownership model**: each bounded context (e.g., Case Management, Intelligence Graph, Billing) owns its GraphQL schema segment, corresponding Postgres schemas, and Neo4j labels. Schema changes require design review plus backward-compatibility tests executed in CI.

## SLO & Cost Trade-offs
- Additional review and automated contract testing adds ~4 engineer-hours per change but protects 99.5% schema availability SLO and reduces incident MTTR.
- Central schema registry and linting pipelines cost <$1k/year in tooling but eliminate ad hoc coordination overhead.

## Consequences
- Requires a schema governance board and tooling to propagate ownership metadata into documentation.
- Demands migration scaffolding to keep Postgres/Neo4j parity when domain teams evolve models.

## Rollback Plan
- **Rollback if** schema governance tooling introduces deployment delays >24 hours or causes repeated CI false positives blocking releases.
- Temporarily revert to centralized schema ownership (architecture team) while triaging automation noise and refining compatibility tests.
