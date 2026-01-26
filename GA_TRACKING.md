# Summit GA Readiness Tracker (MVP-4-GA)

**Status:** AMBER
**Target:** GA-Ready Release Candidate

## I. Snapshot Report
* **Security:** `unifiedAuth.ts` implemented with API Key hashing. Gitleaks active.
* **CI:** Speed-optimized reusable CI implemented. Jest config needs final validation.
* **Governance:** GA Evidence Map and bundle generation logic implemented. CDC Validator online.
* **Blockers:**
    1.  **SOLVED:** `server/src/middleware/unifiedAuth.ts` - API Key verification implemented.
    2.  **CRITICAL:** CI Test Suite (Jest) stability check.
    3.  **HIGH:** OPA Policies need verification.
    4.  **SOLVED:** GA Documentation (`docs/ga/`) initialized with Evidence Map.

## II. GA Blocker List (Canonical)

| ID | Severity | Area | Description | Acceptance Criteria | Fix Approach |
|----|----------|------|-------------|---------------------|--------------|
| B1 | Solved | Security | Auth Middleware ignores API Keys | `verifyApiKey` function checks DB | Merged in #1766 |
| B2 | Blocker | CI | Jest fails to start | `npm test` runs (even if tests fail) | Fix `ts-jest` config OR migrate to `node:test` |
| B3 | Solved | Governance | Missing GA Release Docs | `docs/ga/` populated | Merged in #1766 |
| B4 | High | Governance | OPA Policies unchecked | `opa check` passes | Run/Fix OPA policies |

## III. PR Execution Plan

| Workstream | PR Name | Scope | Verification |
|------------|---------|-------|--------------|
| B (Security)| `fix(auth): implement api key verification` | `server/src/middleware/unifiedAuth.ts` | `server/scripts/verify_auth.ts` |
| A (CI) | `fix(test): restore jest configuration` | `server/jest.config.js` | `npm test` |
| D (Docs) | `docs: init ga release bundle` | `docs/ga/*` | Manual review |

## IV. Execution Log
* [x] Created GA_TRACKING.md
* [x] **Verified Fix B1:** Created `server/scripts/verify_auth.ts` and implemented DB check in `unifiedAuth.ts`.
* [x] **Corrected B1:** Updated logic to use SHA-256 hashing.
* [x] **Added Migration:** `server/migrations/20251227000000_add_api_keys.sql` created to support `api_keys` table.
* [x] **GA Infrastructure:** Implemented GA deploy gates and Speed-optimized CI.
* [x] **CDC Sync Validator:** Created `@intelgraph/graph-sync-validator` to ensure RDBMS/Graph consistency.
