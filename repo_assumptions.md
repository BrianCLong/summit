# Repo Assumptions (OMB M-26-05 Implementation)

## Verified Paths
- `docs/security/`: Exists for security documentation.
- `docs/ci/REQUIRED_CHECKS_POLICY.yml`: Authoritative registry of CI gates.

## Assumptions
- `.github/workflows/`: Exists for GitHub Actions.
- Node.js/pnpm: Primary runtime and package manager.
- GitHub OIDC: Available for provenance signing/attestation.

## Constraints
- **Determinism:** No timestamps allowed in `report.json` or `metrics.json`.
- **Hard Stop:** Maximum 6 PRs for implementation.
- **Feature Flags:** Risky changes must be gated.
