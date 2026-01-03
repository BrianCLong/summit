# Release Integrity Implementation

**Date**: 2026-01-03
**Status**: Implemented

## Release Process

The release process is fully automated and secured:

- **Workflows**: `_reusable-release.yml` orchestrates the entire release.
- **Artifacts**:
  - **Container Images**: Signed & Attested (SLSA L3) pushed to GHCR.
  - **Release Bundle**: `compliance-bundle-vX.Y.Z.tgz` containing source SBOM, image SBOMs, manifest, and checksums.
  - **Provenance**: `provenance.intoto.jsonl` verifying the Release Bundle itself.
  - **Digests**: `checksums.txt` for all bundle contents.

## Controls Implementation

| Control             | Status      | Implementation                                                                                                                                                                |
| :------------------ | :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SBOM Generation** | ✅ Complete | Unified via `scripts/release/sbom.sh` (Syft). Generates SPDX JSON for source and containers. Included in Release Bundle.                                                      |
| **Provenance**      | ✅ Complete | SLSA Level 3 provenance generated via `slsa-framework/slsa-github-generator`. Covers both Container Images (registry attestation) and the Release Bundle (asset attestation). |
| **Signing**         | ✅ Complete | Keyless signing via OIDC (Cosign) enabled in `_reusable-slsa-build.yml` and `_reusable-release.yml`.                                                                          |
| **Verification**    | ✅ Complete | `scripts/release/verify.sh` provides automated verification. Supports basic checks (Digests+SBOM) and Strict Mode (`--strict`) for cryptographic identity verification.       |

## Usage

### Verification

```bash
# Local developer verification
make release-verify

# Auditor strict verification
./scripts/release/verify.sh dist --strict --source BrianCLong/summit --tag vX.Y.Z
```

### Generation

```bash
# Generate local SBOMs
make sbom
```
