# Release Contract

**Version**: 1.0.0
**Last Updated**: 2026-01-03

This document defines the artifacts, locations, and verification methods for Summit releases.

## 1. Release Artifacts

Every tagged release `vX.Y.Z` produces the following artifacts:

| Artifact Type       | Name / Pattern                     | Location                  | Description                                      |
| :------------------ | :--------------------------------- | :------------------------ | :----------------------------------------------- |
| **Container Image** | `ghcr.io/intelgraph/server:vX.Y.Z` | GitHub Container Registry | Production server image                          |
| **Container Image** | `ghcr.io/intelgraph/client:vX.Y.Z` | GitHub Container Registry | Production client image                          |
| **Release Bundle**  | `compliance-bundle-vX.Y.Z.tgz`     | GitHub Release Assets     | Archive containing SBOMs, evidence, and manifest |
| **Digests**         | `checksums.txt`                    | GitHub Release Assets     | SHA256 digests of release assets                 |
| **Provenance**      | `provenance.intoto.jsonl`          | GitHub Release Assets     | SLSA provenance attestation                      |

## 2. Naming Conventions

- **Version Strategy**: Semantic Versioning (vX.Y.Z)
- **Image Tags**: `vX.Y.Z` (immutable), `latest` (mutable pointer to latest release)
- **SBOM Files**:
  - `sbom-server.spdx.json`: Server container SBOM
  - `sbom-client.spdx.json`: Client container SBOM
  - `sbom-source.spdx.json`: Repository source SBOM

## 3. Verification

### Automated Verification (Local)

Developers and auditors can verify a release using the `make release-verify` command (requires `cosign`, `syft`, and `slsa-verifier` for full strictness):

```bash
# Basic Verification (Digests + SBOM)
make release-verify

# Strict Verification (Digests + SBOM + Provenance)
# Note: Requires manual arguments if not using defaults
./scripts/release/verify.sh dist --strict --source BrianCLong/summit --tag vX.Y.Z
```

### Manual Verification

1. **Download Artifacts**: Download `checksums.txt`, `provenance.intoto.jsonl`, and `compliance-bundle-vX.Y.Z.tgz`.
2. **Verify Digests**:
   ```bash
   sha256sum -c checksums.txt
   ```
3. **Verify Provenance** (Identity Verification):
   ```bash
   slsa-verifier verify-artifact compliance-bundle-vX.Y.Z.tgz \
     --provenance-path provenance.intoto.jsonl \
     --source-uri github.com/BrianCLong/summit \
     --source-tag vX.Y.Z
   ```

## 4. SBOM Location

SBOMs are generated during the build process and packaged inside the `compliance-bundle-vX.Y.Z.tgz` attached to the GitHub Release. They are also embedded in the container images where possible (`/sbom.spdx.json`).
