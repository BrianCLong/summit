# Grant Elevated Access Approvals Test Plan

This plan defines layered coverage for the "grant_elevated_access" workflow, spanning OPA policy evaluation, backend APIs, and the Switchboard UI. Playwright is the reference E2E harness, but the structure maps cleanly to Cypress.

## Scope and Goals
- Validate request → decision → provenance lifecycle for elevated-access approvals across tenants.
- Ensure UI behavior mirrors policy outcomes (including denial and prior decisions) without granting unauthorized roles.
- Provide regression hooks for theming/white-labeling and basic latency guardrails.

## Assumptions & Fixtures
- Login helpers/fixtures for roles: `orgAdmin` (requester), `securityAdmin` (approver), `randomUser` (cannot request/approve).
- Test tenant/user/role seeds plus identity adapter stub to assert role grants are applied or withheld.
- Ability to inject policy fixtures (e.g., deny cross-tenant approvals) and toggle simulation failure.

## Layered Coverage
### 1) Unit & Policy
- Rego tests for `grant_elevated_access`:
  - Org admin same-tenant requester → allow + `requires_approval` true.
  - Non-admin requester → deny.
  - Security admin approver same tenant → `can_approve` true.
  - Approver from different tenant or missing role → deny approval.
- Backend unit tests for handlers and provenance service: decision state machine, evidence bundle creation, receipt persistence, and idempotence (409 on already decided).

### 2) Integration / API
Target the real-ish backend with seeded DB.
- `POST /approvals` → 201 PENDING; 400 invalid payload; provenance seed initialized.
- `POST /approvals/:id/decision` → 200 APPROVED/REJECTED; 403 when policy blocks approver; 409 when already decided; provenance rows created or rolled back on storage failure.
- `GET /policy/simulate` → 200 happy path; 500/chaos mode surfaces clear error to caller.
- `GET /receipts/:id` → 200 valid receipt; 403 unauthorized; 404 unknown ID.

### 3) End-to-End (Playwright)
Core flows from UI → API → OPA → provenance → UI.
1. **Happy Path Approve**: orgAdmin requests; securityAdmin reviews, simulates, approves with rationale. Expect PENDING → APPROVED, rationale shown read-only, timeline shows requested+approved, receipt link 200.
2. **Reject Flow**: approver rejects with rationale. Expect PENDING → REJECTED, identity adapter confirms role not granted, timeline shows requested+rejected.
3. **Rationale Required**: Approve radio selected with empty rationale keeps "Submit decision" disabled; filling enables; clearing disables.
4. **Policy-Blocked Approval**: Policy denies approver (e.g., wrong tenant). UI shows request; decision attempt returns 403 and surfaces banner “You are not allowed to approve this request.” Status stays PENDING; no decision recorded.
5. **Simulation Failure Handling**: Force simulation error; detail view shows "Simulation unavailable" (or equivalent) without crash; decision actions still enforce backend policy.
6. **Idempotence**: Open already APPROVED item; decision controls replaced by read-only state. Direct POST attempt returns 409 and UI (if triggered) shows an error toast; status remains unchanged.
7. **Theming Smoke**: Run approvals page under Theme A (Summit) and Theme B (Partner). Assert core elements visible/legible; optional snapshot or class assertion.
8. **Latency Sanity**: Capture create → approve duration; fail or warn if grossly above threshold (e.g., >10s) to guard regressions.

## Reporting & Tooling
- Preferred command: `pnpm run test:e2e` (or `npm run test:e2e`) with Playwright reporters enabled (HTML/trace for failures).
- Tag scenarios to allow focused runs (happy path vs. chaos/policy blockers).
- Capture receipts/timeline assertions as screenshots for UI regressions; keep traces for policy or provenance mismatches.

## Exit Criteria
- All layered tests passing in CI for this slice; E2E suite stable (no flakes across two successive runs).
- Coverage targets met for touched code paths (≥80% overall, ≥85% on handlers/policy evaluation logic).
- Known negative cases (policy-denied, already-decided, simulation failure) reliably surfaced to the UI without state drift.
