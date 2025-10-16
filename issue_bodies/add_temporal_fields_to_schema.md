### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - Graph / DB
Excerpt/why: "Temporal fields: `validFrom/validTo`, `observedAt/recordedAt`"

### Problem / Goal

Incorporate `validFrom/validTo` and `observedAt/recordedAt` fields into the graph schema for all relevant entities and relationships.

### Proposed Approach

Modify the canonical schema to include these temporal properties on nodes and edges, and update ingest/write paths to populate them.

### Tasks

- [ ] Update canonical schema definition with temporal fields.
- [ ] Implement database migrations to add temporal fields.
- [ ] Update ingest/write paths to populate temporal fields.

### Acceptance Criteria

- Given any relevant entity or relationship, when queried, then it includes `validFrom/validTo` and `observedAt/recordedAt` properties.
- Metrics/SLO: Temporal field addition adds no more than 5% overhead to write operations.
- Tests: Unit tests for temporal field population, schema validation tests.
- Observability: N/A

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Define canonical graph schema

### DOR / DOD

- DOR: Temporal schema extension design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
