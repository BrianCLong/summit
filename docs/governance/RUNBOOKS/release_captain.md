# Release Captain Runbook

**Role:** Release Captain
**Duty:** Shepherd a release from candidate to production.

## Pre-Flight
1.  [ ] Check the [Unified Gate](../UNIFIED_GATE.md) status for `main`.
2.  [ ] Ensure all P0/P1 issues are resolved.
3.  [ ] Verify [Evidence Bundle](../EVIDENCE.md) generation.

## Execution
1.  **Cut Release Branch:** `git checkout -b release/vX.Y.Z`
2.  **Bump Version:** `npm version minor` (or patch/major)
3.  **Push:** `git push origin release/vX.Y.Z`
4.  **Wait for CI:** Ensure the Release Gate passes.
5.  **Approve:** Get Governance Board sign-off on the PR.
6.  **Merge:** Merge to `main` (triggers deployment).

## Post-Flight
1.  [ ] Verify deployment health.
2.  [ ] Check `governance-drift-check` post-deploy.
3.  [ ] Announce in `#releases`.
