### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - Report/Disclosure Pack v0.4
Excerpt/why: "inline citation stubs"

### Problem / Goal

Provide placeholders for inline citations within generated reports.

### Proposed Approach

Integrate a mechanism in the report generation process to insert citation markers that can later be populated with actual citation details.

### Tasks

- [ ] Define citation stub format.
- [ ] Implement citation stub insertion in report templates.
- [ ] Develop UI/logic for populating citation stubs.

### Acceptance Criteria

- Given a report is generated, when viewed, then inline citation stubs are present where expected.
- Metrics/SLO: Citation stub insertion adds negligible overhead to report generation.
- Tests: Unit tests for stub insertion.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [frontend] Implement evidence-first brief generation

### DOR / DOD

- DOR: Inline citation stub design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
