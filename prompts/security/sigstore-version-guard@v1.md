# Sigstore Version Guard (PR1)

## Objective
Implement deterministic sigstore version guardrails to block known-vulnerable sigstore Go and sigstore-python versions, emitting a JSON report artifact and updating roadmap status.

## Requirements
- Add a version guard script under `scripts/security/` that scans tracked Go and Python dependency manifests.
- Fail when `github.com/sigstore/sigstore` is below `1.10.4` or `sigstore` (Python) is below `4.2.0`.
- Emit `artifacts/supply-chain/sigstore/version_report.json` deterministically.
- Add unit tests for the guard.
- Wire a package script entry for the guard.
- Update `docs/roadmap/STATUS.json` and `repo_assumptions.md` with current findings.

## Constraints
- Do not change production deployment workflows.
- Keep report generation deterministic (no timestamps).
- Prefer repo-root relative paths.

## Verification
- `node --test scripts/security/__tests__/check_sigstore_versions.test.ts`

## Deliverables
- Guard script, tests, package script entry, and updated documentation.
