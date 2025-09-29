# Sprint 16 Test Plan

## Areas
- Budget enforcement and read-only guards.
- NL→Cypher Copilot planning.
- Temporal path computations.
- Report sanitization.

## Strategy
- Unit tests for QueryBudgetGuard, Nl2CypherService, TemporalPathService, and HuntReport.
- Integration tests for hunting resolvers using mock Neo4j session.
- Manual UI walkthrough of Hunting Studio flows.

## Budget Caps
- Default max 5s execution, 10k rows, 3 expansions.
- Tests verify exceeding caps triggers error.

## Read-Only Enforcement
- Attempted write operations should be rejected by ReadOnlyGuard.

## Temporal Path Tests
- Verify k-shortest temporal paths return ordered paths within time window.

## Report Sanitization
- Ensure PII fields are removed when exporting by default.

## Exit Criteria
- All automated tests passing.
- No critical defects open.
