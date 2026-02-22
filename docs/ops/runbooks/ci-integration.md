# Runbook: CI Evidence Integration

## Summit Readiness Assertion
This runbook is governed by `docs/SUMMIT_READINESS_ASSERTION.md`.

## Objectives
- Collect SBOMs, provenance, test results.
- Sign evidence and upload to Evidence API.
- Enforce policy gating before release promotion.

## Steps
1. Generate SBOMs (SPDX + CycloneDX).
2. Generate SLSA provenance for the artifact digest.
3. Sign evidence bundle with approved signer.
4. Upload bundle via Evidence CLI.
5. Verify policy decision and release gate outcome.

## Validation
- Evidence ID matches `EVID-SC-{artifact_digest}-{policy_bundle_digest}`.
- Release gate reports allow.

## Rollback
- Block promotion and revert policy bundle to previous digest.
