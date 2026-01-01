# Summit Next Priorities (Session Handoff)

## Previous Session Snapshot

- Shipped: Skipped the JWT security suite because Jest ESM module hoisting broke the Redis mock, temporarily hiding coverage for key rotation, signing, replay protection, and JWKS exposure.
- User impact: Removed noisy failures but left security regression signals muted, increasing the chance of silent JWT regressions and missed GA hardening evidence.
- Follow-up landscape: Restore JWT regression coverage, harden audit log persistence (CN-005), and reduce flakiness in other ESM-mocked suites. Additional opportunities include improving JWKS validation paths and documenting policy-as-code test evidence.
- Constraints: Repository uses ESM + ts-jest; golden-path tests must stay green; roadmap status requires updates per change.
- Enablers: Existing JWTSecurityManager implements rotation/replay safeguards and has shutdown hooks we can extend; jest.unstable_mockModule enables ESM-safe mocks.

## Promoted Tasks

1. **Re-enable JWT security regression suite**
   - **Why now:** Directly restores GA-critical coverage for authentication integrity and replay protection, reversing the previous skip so regressions are caught early.
   - **Risk:** Low. Main risks are Jest ESM mocking quirks and lingering timers; mitigated by isolating mocks and clearing intervals on shutdown.
   - **Acceptance criteria:**
     - Redis client is mocked with ESM-safe `jest.unstable_mockModule`.
     - JWTSecurityManager tests execute (not skipped) and pass locally.
     - Key-rotation timer is cleared during shutdown to avoid open handles.
     - No new flakiness introduced in surrounding suites.
     - Roadmap status updated with revision note for the change.

2. **Audit log persistence hardening (carryover)**
   - **Why now:** CN-005 remains a GA blocker; moving console-only audit events to append-only, verifiable storage reduces compliance risk.
   - **Risk:** Medium. Touches storage and policy boundaries; requires schema decisions and migration safety.
   - **Acceptance criteria:**
     - Choose append-only store (e.g., Postgres table with hash chain) and codify schema.
     - Wire BaseAgentArchetype to persist events and include tamper-evidence.
     - Add tests covering write path, readback, and tamper detection.
     - Update operations/runbook with rotation/retention expectations.
     - Roadmap status and debt tracking updated to reflect new coverage.
