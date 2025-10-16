### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - AI / NLP
Excerpt/why: "Confidence/guarded language helper for Report Studio"

### Problem / Goal

Provide tools in Report Studio to assist users in using confidence and guarded language in their reports.

### Proposed Approach

Develop UI components or text analysis features that suggest appropriate confidence levels or flag overly assertive language based on evidence strength.

### Tasks

- [ ] Define guidelines for confidence/guarded language.
- [ ] Implement UI suggestions or linter for report text.
- [ ] Integrate with report editor.

### Acceptance Criteria

- Given a user is drafting a report, when they use assertive language without sufficient evidence, then the helper suggests more guarded phrasing or flags the assertion.
- Metrics/SLO: Helper suggestions appear within 500ms.
- Tests: Unit tests for language analysis, E2E test for helper functionality.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A
- Compliance: Promotes responsible reporting and avoids misrepresentation.

### Dependencies

Blocks: None
Depends on: [frontend] Implement evidence-first brief generation

### DOR / DOD

- DOR: Language helper design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
