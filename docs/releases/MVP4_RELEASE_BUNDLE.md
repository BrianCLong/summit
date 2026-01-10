# MVP-4 Release Artifact Bundle

This document serves as the authoritative index for the MVP-4 Release.
It references all critical artifacts, checklists, and baselines required for the release.

## Verification
To verify this bundle and its requirements, run:
```bash
node scripts/ops/verify_release_bundle.mjs --mode=hard
```
*Expected Output: Exits 0; all PASS on required gates.*

## Core Documents
- [MVP-4 GA Baseline](docs/releases/MVP-4_GA_BASELINE.md)
- [MVP-4 GA Master Checklist](docs/ga/MVP4-GA-MASTER-CHECKLIST.md)
- [Summit Readiness Assertion](docs/SUMMIT_READINESS_ASSERTION.md)

## Verification Scripts
The following scripts are required for release verification:
- `scripts/ci/check_repo_hygiene.sh`
- `scripts/ci/verify_evidence_map.mjs`
- `scripts/ci/verify_security_ledger.mjs`
- `scripts/ops/generate_trust_dashboard.mjs`
