# Repo Assumptions: Production AI Architecture Blueprint

This document records the verified and assumed paths for the architecture blueprint implementation against the `BrianCLong/summit` repository.

## Verified Paths
- `docs/architecture/README.md` exists and serves as the canonical architecture entry point.
- `docs/security/README.md` exists and anchors the security namespace.
- `.github/workflows/` and `.github/required-checks.yml` manage the CI and governance gates.
- `absorption/manifest.json` provides an existing artifact pattern.

## Assumed Paths
- `docs/blueprints/` is the expected path for blueprint documents.
- `scripts/monitoring/` is the preferred path for drift detector scripts.
- `docs/standards/` is the expected path for interop matrices.
- `docs/ops/runbooks/` is the chosen path for operator runbooks (vs the top-level `RUNBOOKS/`).

## Must-Not-Touch Files
The following files must NOT be modified by this blueprint PR stack to preserve existing governance policies:
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `.github/required-checks.yml`
- `.github/merge-queue-config.json`
- Existing release or branch-protection reconciler scripts.
