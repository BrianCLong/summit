# GA Release Process

## Overview

This document defines the process for creating a General Availability (GA) release of the Summit platform. The process is fully automated via GitHub Actions, enforcing strict governance and provenance checks.

## Preconditions

Before triggering a GA release, the following must be true:

1.  **Code Freeze**: The release branch (`release/vX.Y`) is locked (enforced by `rc-lockdown.yml`).
2.  **Validation**: All tests (unit, integration, e2e, policy) are passing.
3.  **Documentation**: API docs and Release Notes are up-to-date.
4.  **Governance**: All changes in the release have valid approvals and traceability links.

## Automation Workflow

The release is orchestrated by the `.github/workflows/release-ga.yml` workflow, triggered by pushing a `v*` tag.

### Steps:

1.  **Verification Gate**:
    - Runs full test suite (`npm run test:server`, etc.).
    - Runs policy checks (`scripts/policy-test.sh`).
    - Verifies documentation coverage (`scripts/check_traceability.cjs`).
    - **Failure here stops the release.**

2.  **Build & SBOM**:
    - Builds Docker images for Server and Client.
    - Generates SBOMs (CycloneDX format) using `syft` via `scripts/compliance/generate_sbom.sh`.
    - SBOMs are stored in `compliance/sbom`.

3.  **Evidence Collection**:
    - Aggregates test results, policy logs, and SBOMs into an Evidence Bundle.
    - Structure defined in `docs/ga/evidence-bundle-schema.md`.

4.  **Signing**:
    - Signs all evidence artifacts using `cosign` and the project's private key.
    - Generates SLSA attestations.

5.  **Publication**:
    - Packages the Evidence Bundle and SBOMs into `release-bundle.tar.gz`.
    - Creates a GitHub Release with the tag `vX.Y.Z`.
    - Uploads the bundle as a release asset.
    - Publishes release notes.

## Manual Trigger

To cut a release:

1.  Ensure you are on the `main` or release branch.
2.  Tag the commit: `git tag v1.0.0`
3.  Push the tag: `git push origin v1.0.0`

## Verification

After the workflow completes:

1.  Download `release-bundle.tar.gz` from the GitHub Release.
2.  Verify signatures using `cosign verify-blob`.
3.  Inspect `evidence/` for test and policy proofs.

### GitHub Check: Release Evidence Check

To support branch protection rules, a separate, lightweight GitHub workflow (`release-evidence-check.yml`) runs on tag creation or manual dispatch. This check provides a clear "pass/fail" status in pull requests and branch protection settings.

- **Purpose**: Verifies that a valid, non-expired "GO" decision has been formally recorded in `release-evidence/<TAG>.json` _before_ the release can be finalized.
- **Check Name**: `Release Evidence Check`

#### Troubleshooting Failures

If the "Release Evidence Check" fails, the reason will be in the check's summary logs. Common failures include:

- `EVIDENCE_MISSING`: The `release-evidence/<TAG>.json` file was not found. This usually means the pre-release approval workflow was not run or failed.
- `EVIDENCE_NOT_GO`: The evidence file exists, but the `decision` field is not set to `"GO"`.
- `EVIDENCE_SHA_MISMATCH`: The commit SHA in the evidence file does not match the SHA of the tag.
- `EVIDENCE_EXPIRED`: The evidence was generated too long ago and is considered stale.

**To fix:** A maintainer must re-run the Maestro dry-run or the relevant approval workflow to regenerate the evidence file with the correct contents for the target tag.
