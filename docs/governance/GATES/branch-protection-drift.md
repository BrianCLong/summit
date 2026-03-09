Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: branch-protection-drift
Status: active

# Branch Protection Drift Gate

**Job:** Governance / Branch Protection Drift  
**Command:** `pnpm ci:branch-protection:check`  
**Evidence:** `artifacts/governance/branch-protection-drift/`

This gate detects drift between policy-as-code and GitHub branch protection.

## Admin Handoff (Issue #15790)

Branch protection enforcement requires GitHub admin access. Apply required
status checks on `main` using the policy source of truth in
`docs/ci/REQUIRED_CHECKS_POLICY.yml`, then verify enforcement by attempting a
merge with a failing required check.

**Required check contexts (current policy):**

- CI Core (Primary Gate)
- CI / config-guard
- CI / unit-tests
- GA Gate
- Release Readiness Gate
- SOC Controls
- Unit Tests & Coverage
- ga / gate

**Verification steps:**

1. Open a PR with a deliberate failure in one required check.
2. Confirm GitHub blocks the merge with “required check failed.”
3. Fix the failure and confirm the merge is allowed.
