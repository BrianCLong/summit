### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - DevEx / SRE
Excerpt/why: "Golden fixtures"

### Problem / Goal

Develop a set of golden fixtures for testing ingest mappings and NL→Cypher generation.

### Proposed Approach

Create stable, versioned data sets and expected outputs that serve as ground truth for automated tests, ensuring consistency across development cycles.

### Tasks

- [ ] Define golden fixture data format.
- [ ] Create initial golden fixtures for ingest.
- [ ] Create initial golden fixtures for NL→Cypher.

### Acceptance Criteria

- Given a test run, when golden fixtures are used, then tests are deterministic and reliable.
- Metrics/SLO: N/A
- Tests: Golden fixture validation tests.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [data-platform] Implement CSV/JSON upload for Ingest Wizard, [orchestrator-core] Implement NL → Cypher generation

### DOR / DOD

- DOR: Golden fixture strategy approved.
- DOD: Fixtures created, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
