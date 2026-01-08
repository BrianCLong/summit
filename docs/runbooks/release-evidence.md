# Release Evidence Pack Runbook

## Overview
The Release Evidence Pack is a verifiable collection of build metadata, SBOMs, and cryptographic attestations generated for every release candidate and GA tag. It enables offline verification of release integrity.

## Evidence Pack Contents
Location: `dist/evidence/` (in CI artifact `evidence-pack`)

- `manifest.json`: The master list of all files in the pack with their SHA256 checksums.
- `build-info.json`: Metadata including Git SHA, tag, workflow run ID, and build environment details.
- `sbom/`: Directory containing Software Bill of Materials (CycloneDX JSON).
- `attestations/`: Directory containing cryptographic attestation bundles (`.bundle.json`) for the build artifacts.
- `ci/`: Copies of critical CI reports (e.g., test summaries).
- `signatures/checksums.sha256`: Plain text SHA256 checksums for quick verification.

## Verification

### Automated Verification (CI)
The `Release Evidence Pack` workflow automatically runs verification:
1. **Online Mode**: Verifies checksums and basic integrity during the build.
2. **Offline Mode**: Downloads the evidence pack artifact in a separate job and verifies it without external network dependencies (simulated).

### Manual / Offline Verification
To verify an evidence pack manually (e.g., during an audit):

1. **Download the Evidence Pack**:
   Get the `evidence-pack` artifact from the GitHub Action run.

2. **Run the Verification Script**:
   Ensure you have Node.js installed.

   ```bash
   # Extract the artifact
   unzip evidence-pack.zip -d evidence

   # Run verification
   npx tsx scripts/verification/verify_evidence_pack.ts --evidence-dir evidence --offline
   ```

3. **Verify Attestations with GitHub CLI (Optional)**:
   If you have the build artifacts and the attestation bundles, you can use `gh`:

   ```bash
   gh attestation verify <path-to-artifact> --bundle <path-to-bundle> --owner <owner>
   ```

## Interpreting Failures

- **Checksum Mismatch**: The file content does not match `manifest.json` or `checksums.sha256`. Indicates potential tampering or corruption.
- **Missing File**: A required file listed in the checksums is missing.
- **Invalid Bundle**: The attestation bundle JSON is malformed.

## Release Operations
1. **Attach Evidence**: When publishing a GitHub Release, attach the `evidence-pack` zip (or contents) alongside the binaries.
2. **Audit Retention**: Store the evidence pack in long-term storage (e.g., S3 WORM bucket) as per compliance policy.
