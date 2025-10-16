### Context

Source: SPRINT_MAESTRO_COMPOSER_BACKEND.md - 2) Epics → Stories → Acceptance Criteria - Epic F — Federation & SDK
Excerpt/why: "TS SDK (2 pt) — thin client for Composer UI."

### Problem / Goal

Create a thin TypeScript client SDK for interacting with the Composer backend APIs.

### Proposed Approach

Develop a TypeScript library that provides type-safe API clients and utility functions for consuming the Maestro Composer backend services, simplifying UI development.

### Tasks

- [ ] Define SDK API surface.
- [ ] Implement TypeScript client for REST APIs.
- [ ] Provide example usage and documentation.

### Acceptance Criteria

- Given the SDK is imported into a TypeScript project, when used, then it provides type-safe access to Composer APIs and example code compiles successfully.
- Metrics/SLO: SDK build time < 30 seconds.
- Tests: Unit tests for SDK client, integration tests with backend APIs.
- Observability: N/A

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: [orchestrator-core] Implement API to list workflows (GET /api/workflows)

### DOR / DOD

- DOR: TypeScript SDK design approved.
- DOD: SDK implemented, tests pass, documentation updated.

### Links

- Docs: SPRINT_MAESTRO_COMPOSER_BACKEND.md
