# Waiver: CI Test Runner Stability

| ID | WAIVER-003-TEST-RUNNER-STABILITY |
|----|----------------------------------|
| **Scope** | `tier-b` Verification Checks |
| **Status** | ACTIVE (Non-Blocking) |
| **Owner** | DevOps Team |
| **Review Date** | 2025-12-30 |

## Context
The current CI environment for verification checks (`make ga-verify`, `scripts/ga/verify-ga-surface.mjs`) has stability issues related to Node.js versioning and dependency resolution in the GitHub Actions runner.

## Decision
Verification checks labeled as "Tier B" in `docs/ga/MVP-4-GA-VERIFICATION.md` are executed on a best-effort basis in CI. Their failure does not automatically block deployment if the "Tier A" checks (Accessibility, Build, Security) pass.

## Mitigation
- **Pre-Release Audit**: Release Captain manually executes verification scripts in a stable local environment before tagging a release.
- **Evidence Bundle**: Evidence of local verification is attached to the release notes.

## Exit Criteria
This waiver expires when the CI runner environment is standardized (Dockerized) to match the local development environment, ensuring 100% reproducibility of verification scripts.
