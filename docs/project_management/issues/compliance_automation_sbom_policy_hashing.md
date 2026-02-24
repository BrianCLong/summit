# Codex Task: Compliance Automation (SBOM and Policy Hashing)

**Priority:** P0/P1  
**Labels:** `codex`, `compliance`, `security`, `ga-blocker`

## Desired Outcome

Build and release pipelines produce SBOM and policy-hash evidence automatically.

## Workstreams

- Generate SBOM during build.
- Attach SBOM to release artifacts.
- Hash policy bundles and log hash values per run.
- Add secrets scanning in CI and fail on detection.
- Output compliance summary artifact for each run.

## Key Deliverables

- Build pipeline SBOM generation and artifact upload.
- Policy hash capture integrated into run/evidence metadata.
- Secrets-scan enforcement in CI.
- Compliance summary format with pass/fail controls.

## Acceptance Criteria

- Every release contains SBOM artifact.
- Policy hash is logged per run and included in evidence.
- CI fails when secrets scan detects exposures.
