# GA Merge Window Plan

**Status**: ACTIVE
**Authority**: Jules (Release Captain)

## 1. Entry Criteria
All Pull Requests entering the GA Merge Window must satisfy the following **Hard Gates**:

*   **Status**: Must be classified as `PROMOTE NOW` in `DRAFT_PR_PROMOTION_LEDGER.md`.
*   **CI/CD**: All status checks must be **PASSING** (Green). No force merges.
*   **Approvals**: Must have explicit approval from a human owner (Codeowner) AND Jules.
*   **Evidence**: Must include `<!-- AGENT-METADATA -->` block or linked Evidence Artifacts.
*   **Stability**: Must not touch `golden-path` critical surfaces without Tier A verification.

## 2. Merge Sequencing
The merge queue is strictly ordered to minimize entropy and maximize stability:

1.  **Priority 0: Critical Fixes** (`fix:`) - Addressing known GA blockers (Security, Data Loss, Crash loops).
2.  **Priority 1: Documentation** (`docs:`) - Ensuring accuracy of user-facing and compliance docs.
3.  **Priority 2: Infrastructure/CI** (`ci:`, `test:`) - Validating the release pipeline itself.
4.  **Priority 3: Approved Minor Changes** - Only if explicitly authorized by Governance.

**Prohibited**: New Features (`feat:`), Dependency Updates (`chore(deps)`), Refactors (`refactor:`).

## 3. Freeze Rules
During the GA Merge Window (Now -> GA Declaration):

*   **Code Freeze**: No modifications to `server/src/logic/`, `server/src/policy/` unless fixing a P0 bug.
*   **Dependency Freeze**: `package.json`, `go.mod`, `Cargo.toml` are READ-ONLY.
*   **Config Freeze**: No changes to `infra/`, `terraform/` environments.
*   **Schema Freeze**: No database migrations or GraphQL schema mutations.

## 4. Abort Conditions
The merge window closes immediately and rollback procedures initiate if:

*   **Main Build Failure**: Any commit to `main` causes red CI.
*   **Regression**: Smoke tests (`make smoke`) fail in Staging.
*   **Security Alert**: Trivy/Grype reports new Critical/High vulnerability.
*   **Performance**: P99 Latency exceeds SLO (>500ms) on critical paths.
*   **Compliance**: Missing evidence artifact for a merged PR.

## 5. Execution Checklist
- [ ] Refresh `DRAFT_PR_PROMOTION_LEDGER.md`
- [ ] Verify `SECURITY_GA_GATE.md` compliance
- [ ] Run `scripts/check-boundaries.cjs`
- [ ] Merge `PROMOTE NOW` candidates serially
- [ ] Generate Final GA Readiness Report
