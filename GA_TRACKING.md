# Summit GA Readiness Tracker (MVP-4-GA)

**Status:** RED
**Target:** GA-Ready Release Candidate

## I. Snapshot Report

- **Security:** 2 known overrides in package.json. CI uses Gitleaks. `unifiedAuth.ts` has missing API Key verification.
- **CI:** `mvp4-gate.yml` exists but Jest is BROKEN (`ts-jest` preset missing).
- **Governance:** Epic K (Platform Governance) is largely unimplemented (SBOM, Signing, OPA details).
- **Blockers:**
  1.  **CRITICAL:** `server/src/middleware/unifiedAuth.ts` - Missing API Key verification (Security Risk).
  2.  **CRITICAL:** CI Test Suite (Jest) is failing to run.
  3.  **HIGH:** OPA Policies need verification.
  4.  **HIGH:** GA Documentation (`docs/ga/`) is missing.

## II. GA Blocker List (Canonical)

| ID  | Severity | Area       | Description                      | Acceptance Criteria                  | Fix Approach                                   |
| --- | -------- | ---------- | -------------------------------- | ------------------------------------ | ---------------------------------------------- |
| B1  | Blocker  | Security   | Auth Middleware ignores API Keys | `verifyApiKey` function checks DB    | Implement in `unifiedAuth.ts` + Verify script  |
| B2  | Blocker  | CI         | Jest fails to start              | `npm test` runs (even if tests fail) | Fix `ts-jest` config OR migrate to `node:test` |
| B3  | High     | Governance | Missing GA Release Docs          | `docs/ga/` populated                 | Create runbooks & checklists                   |
| B4  | High     | Governance | OPA Policies unchecked           | `opa check` passes                   | Run/Fix OPA policies                           |

## III. PR Execution Plan

| Workstream   | PR Name                                     | Scope                                  | Verification                    |
| ------------ | ------------------------------------------- | -------------------------------------- | ------------------------------- |
| B (Security) | `fix(auth): implement api key verification` | `server/src/middleware/unifiedAuth.ts` | `server/scripts/verify_auth.ts` |
| A (CI)       | `fix(test): restore jest configuration`     | `server/jest.config.js`                | `npm test`                      |
| D (Docs)     | `docs: init ga release bundle`              | `docs/ga/*`                            | Manual review                   |

## IV. Execution Log

- [x] Created GA_TRACKING.md
- [x] **Verified Fix B1:** Created `server/scripts/verify_auth.ts` and implemented DB check in `unifiedAuth.ts`.
- [x] **Corrected B1:** Updated logic to use SHA-256 hashing.
- [x] **Added Migration:** `server/migrations/20251227000000_add_api_keys.sql` created to support `api_keys` table.
