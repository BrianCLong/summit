# GhostKey Local Secrets Broker Emulator – Jira Ticket Breakdown

## 1. GHOST-1: Scaffold GhostKey Emulator Service
**Summary:** Establish the initial project structure for the GhostKey local secrets broker emulator within `tools/ghostkey`.

### Acceptance Criteria
- Directory layout includes separate folders for source code, fixtures, and tests.
- Package manifest or tooling config (e.g., `pyproject.toml` or equivalent) created with lint/test scripts stubbed.
- README outlines purpose, usage scope (local/preview only), and global merge-clean rules.

### Subtasks
- Create base project structure and placeholder modules.
- Add initial documentation outlining goals, constraints, and merge-clean rules.
- Configure lint/test tooling hooks in the project manifest.

## 2. GHOST-2: Implement Secret Storage Abstraction
**Summary:** Build an in-memory secret store that supports static values and TTL-expiring entries.

### Acceptance Criteria
- Storage API supports create/update, fetch, and metadata inspection.
- TTL values deterministically computed using a seeded clock service.
- Retrieval indicates expired status without removing records until cleanup.

### Subtasks
- Implement seeded clock utility and tests.
- Create secret entry model including static and TTL modes.
- Write unit tests covering creation, retrieval, and expiration behavior.

## 3. GHOST-3: HTTP API Endpoints
**Summary:** Expose REST endpoints compliant with the contract: `PUT /v1/secrets/{name}`, `GET /v1/secrets/{name}`, `POST /v1/rotate/{name}`.

### Acceptance Criteria
- PUT accepts JSON body with secret payload and optional TTL metadata.
- GET returns JSON with current secret value, metadata, and expiry status.
- POST rotate generates new token per rotation policy and updates store.
- 200/404/400/500 status codes documented and covered by tests.

### Subtasks
- Define request/response schemas.
- Implement controller handlers invoking storage abstraction.
- Add endpoint-level tests using JSON contract fixtures.

## 4. GHOST-4: Rotation Policy Engine
**Summary:** Provide rotation logic supporting static and TTL tokens, including deterministic token generation for tests.

### Acceptance Criteria
- Rotation can be invoked manually via API and automatically on expiry.
- Supports pluggable strategies (e.g., static seed, deterministic random) without network calls.
- Rotation events logged/emitted for audit in local logs.

### Subtasks
- Implement rotation strategy interface and default implementation.
- Connect rotation engine to storage updates and metadata.
- Write tests covering manual and expiry-triggered rotations.

## 5. GHOST-5: Ephemeral Token Exporter
**Summary:** Generate `.env.ghost` file exposing ephemeral tokens for downstream tooling.

### Acceptance Criteria
- Export command writes deterministic ordering of key/value pairs.
- Tokens reflect latest rotated/active values, excluding expired entries.
- File generation idempotent; re-run without changes produces identical output.

### Subtasks
- Implement exporter utility reading from store.
- Ensure deterministic sorting and formatting rules.
- Add integration tests verifying file contents.

## 6. GHOST-6: Optional Persistence Layer
**Summary:** Add opt-in persistence activated via `--store` flag without affecting default in-memory behavior.

### Acceptance Criteria
- Absence of flag keeps emulator ephemeral with no disk writes.
- When provided, state persists between runs using local file snapshot.
- Persistence respects deterministic TTL by replaying seed/clock state on load.

### Subtasks
- Implement CLI flag parsing and configuration plumbing.
- Build serialization/deserialization for store entries and clock seed.
- Create tests covering startup/shutdown persistence cycles.

## 7. GHOST-7: Concurrency and Race Condition Tests
**Summary:** Validate concurrent access scenarios to ensure deterministic behavior under load.

### Acceptance Criteria
- Race tests simulate multiple readers/writers without data corruption.
- TTL expiration behavior remains consistent under concurrent access.
- Tests run deterministically with seeded clock and fixed scheduling.

### Subtasks
- Build concurrency test harness leveraging worker pools or async tasks.
- Add fixtures for simultaneous rotations and reads.
- Document deterministic seeding strategy for concurrency tests.

## 8. GHOST-8: CI Integration and Determinism Guardrails
**Summary:** Wire GhostKey project into CI as an opt-in utility with deterministic test gates.

### Acceptance Criteria
- Non-blocking CI job configured initially, with documentation on promotion to blocking after one green week.
- Tests include golden snapshot verification for API responses and `.env.ghost` output.
- CI pipeline avoids external network calls and adheres to global merge-clean rules.

### Subtasks
- Author CI configuration/scripts to run GhostKey test suite.
- Create golden snapshots for API and exporter outputs.
- Document process for elevating CI job from optional to required.
