### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - Graph / DB
Excerpt/why: "Canonical schema (Person, Org, Asset, Event, Document, Claim, Case, Authority, License)"

### Problem / Goal

Establish the canonical schema for core entities and relationships in the graph database.

### Proposed Approach

Define a comprehensive schema including nodes (Person, Org, Asset, Event, Document, Claim, Case, Authority, License) and their relationships, ensuring consistency and extensibility.

### Tasks

- [ ] Document canonical node types and properties.
- [ ] Document canonical relationship types and properties.
- [ ] Create schema migration scripts for initial setup.

### Acceptance Criteria

- Given the schema definition, when reviewed, then it is comprehensive, consistent, and covers all specified canonical entities.
- Metrics/SLO: N/A
- Tests: Schema validation tests.
- Observability: N/A

### Safety & Policy

- Action class: WRITE
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: Canonical schema definition approved.
- DOD: Schema implemented in DB, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
