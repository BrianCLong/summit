# Branch Protection Policy

This policy is enforced automatically via CI.

## Controls
- Policy-as-code source: `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- Drift is evaluated against live GitHub branch protection on `main`
- Required check contexts and strict mode are enforced via drift + reconcile workflows
- Review requirements are governed by branch/ruleset configuration

## Verification
- scripts/ci/check_branch_protection_drift.mjs
- scripts/ci/verify_required_checks.mjs
- scripts/ci/governance-meta-gate.mjs

## Evidence
- docs/ga/evidence/ci-governance/
