### Context

Source: SPRINT_PROVENANCE_FIRST.md - 2) Scope (In) - NL → Cypher Query Copilot v0.6
Excerpt/why: "Prompt → generated Cypher preview"

### Problem / Goal

Develop a component that translates natural language prompts into syntactically valid Cypher queries.

### Proposed Approach

Utilize a templated grammar or a rule-based system (stub initially) to parse natural language and generate corresponding Cypher.

### Tasks

- [ ] Define core NL-to-Cypher grammar/rules.
- [ ] Implement Cypher generation logic (stub).
- [ ] Integrate with a prompt input interface.

### Acceptance Criteria

- Given a suite of ≥30 natural language prompts, when processed by the generator, then ≥95% of the generated Cypher queries are syntactically valid.
- Metrics/SLO: Cypher generation p95 latency < 500ms.
- Tests: Unit tests for grammar/rules, E2E test for successful generation.
- Observability: Logs for generation requests and errors.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: NL→Cypher generation design approved.
- DOD: Code merged, tests pass, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
