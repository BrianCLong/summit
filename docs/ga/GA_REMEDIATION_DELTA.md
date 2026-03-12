# GA Remediation Delta

## Blocker Identified

Governance control gap: CI did not include a deterministic gate that blocks unresolved merge conflict markers in changed non-documentation files. This allowed high-blast-radius malformed workflow/governance changes to survive until later pipeline stages.

## Action Taken

Implemented a dedicated pull request CI gate (`conflict-marker-gate`) in `.github/workflows/ci.yml` that evaluates only changed files and fails fast if merge conflict markers are detected.

Added `scripts/ci/verify_no_conflict_markers.mjs` to enforce this policy deterministically using `BASE_SHA..HEAD_SHA` diff scope.

## Files Modified

- `.github/workflows/ci.yml`
- `scripts/ci/verify_no_conflict_markers.mjs`
- `.repoos/ga-readiness-assessment.json`
- `.repoos/evidence/ga-remediation-report.json`
- `.repoos/evidence/ga-remediation-stamp.json`
- `docs/ga/GA_REMEDIATION_DELTA.md`

## Risk Reduction

- Eliminates a known merge-path for malformed YAML/JS/policy artifacts containing unresolved conflict markers.
- Reduces wasted CI cycles and false-negative governance confidence.
- Improves deterministic gate coverage without changing production runtime behavior.

## Remaining Risks

- Existing conflict markers already present on default branch history are not retroactively remediated by this gate.
- Some workflows still use version tags rather than pinned SHAs; enforcement remains partial depending on local verifier scope.
- Branch protection drift checks remain token-dependent in `ci-governance`.

## Recommended Next Intervention

Implement a repository-wide required-check that scans tracked files (excluding approved text lockfiles/docs) for conflict markers on both push and pull_request events, with artifacted findings and policy mapping into GA verification surfaces.
