# SLSA Level 3 Compliance Guide

> **Last Updated**: 2025-11-29
> **Status**: Production Ready
> **SLSA Version**: v1.0

## Table of Contents

1. [Overview](#overview)
2. [SLSA Level 3 Requirements](#slsa-level-3-requirements)
3. [Implementation Architecture](#implementation-architecture)
4. [Workflows](#workflows)
5. [Verification](#verification)
6. [Air-Gapped Deployments](#air-gapped-deployments)
7. [Troubleshooting](#troubleshooting)
8. [Compliance Matrix](#compliance-matrix)

---

## Overview

This document describes IntelGraph's implementation of [SLSA (Supply-chain Levels for Software Artifacts)](https://slsa.dev/) Level 3 compliance for container images and software artifacts.

### What is SLSA?

SLSA is a security framework that provides a checklist of standards and controls to prevent tampering, improve integrity, and secure packages and infrastructure. It consists of four levels:

| Level | Description |
|-------|-------------|
| SLSA 1 | Documentation of the build process |
| SLSA 2 | Tamper resistance of the build service |
| SLSA 3 | Extra resistance to specific threats |
| SLSA 4 | Highest level of assurance (reproducible builds) |

### Why SLSA Level 3?

SLSA Level 3 provides:
- **Hermetic builds**: Build environment is isolated with no network access
- **Signed provenance**: Cryptographic proof of build origin
- **Non-falsifiable attestations**: Attestations cannot be forged
- **Trusted builders**: Only approved build systems can generate artifacts

---

## SLSA Level 3 Requirements

### Build Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Scripted Build** | Dockerfile and GitHub Actions workflows |
| **Build Service** | GitHub-hosted runners |
| **Build as Code** | All build logic in repository |
| **Ephemeral Environment** | Fresh runner for each build |
| **Isolated** | Docker Buildx with `network=none` |
| **Parameterless** | No manual inputs during build |

### Source Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Version Controlled** | Git repository |
| **Verified History** | Commit signatures (optional) |
| **Retained 18 months** | GitHub retention policies |
| **Two-Person Reviewed** | PR review requirements |

### Provenance Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Available** | SLSA provenance generated for all builds |
| **Authenticated** | OIDC keyless signing via Sigstore |
| **Service Generated** | slsa-github-generator workflow |
| **Non-Falsifiable** | Signed by trusted builder identity |
| **Dependencies Complete** | SBOM (CycloneDX + SPDX) included |

---

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Pre-Build   │───▶│   Hermetic   │───▶│    SLSA      │      │
│  │   Checks     │    │    Build     │    │  Provenance  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Source     │    │   Docker     │    │   SLSA       │      │
│  │   Verify     │    │   Buildx     │    │  Generator   │      │
│  │              │    │  (isolated)  │    │   v2.0.0     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                             │                   │               │
│                             ▼                   ▼               │
│                      ┌──────────────┐    ┌──────────────┐      │
│                      │   Cosign     │    │   In-Toto    │      │
│                      │   OIDC Sign  │    │  Attestation │      │
│                      └──────────────┘    └──────────────┘      │
│                             │                   │               │
│                             └───────┬───────────┘               │
│                                     ▼                           │
│                              ┌──────────────┐                   │
│                              │   Container  │                   │
│                              │   Registry   │                   │
│                              │   (GHCR)     │                   │
│                              └──────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **GitHub Actions OIDC Provider**: Generates short-lived tokens for keyless signing
2. **Sigstore/Cosign**: Signs container images and attestations
3. **SLSA GitHub Generator**: Official SLSA provenance generator
4. **Syft**: Generates SBOM in CycloneDX and SPDX formats
5. **Grype**: Vulnerability scanning of SBOM

---

## Workflows

### Main SLSA L3 Workflow

**File**: `.github/workflows/slsa-l3-provenance.yml`

This workflow runs on:
- Push to `main` branch
- Tag creation (`v*`)
- Pull requests (verification only)
- Manual dispatch

```yaml
# Trigger the workflow
gh workflow run slsa-l3-provenance.yml

# Or push a tag
git tag v1.0.0
git push origin v1.0.0
```

### Air-Gapped Build Workflow

**File**: `.github/workflows/slsa-l3-airgap-build.yml`

For federal/government deployments requiring offline installation:

```yaml
# Create air-gapped bundle
gh workflow run slsa-l3-airgap-build.yml \
  -f bundle_version=v1.0.0 \
  -f target_classification=CUI \
  -f transfer_media=secure_usb \
  -f fips_mode=true
```

### Reusable Build Workflow

**File**: `.github/workflows/_reusable-slsa-build.yml`

For use in other workflows:

```yaml
jobs:
  build:
    uses: ./.github/workflows/_reusable-slsa-build.yml
    with:
      image_name: my-app
      dockerfile: ./Dockerfile
      platforms: linux/amd64,linux/arm64
      sign: true
      sbom: true
      slsa_provenance: true
```

---

## Verification

### Verify Image Signature

```bash
# Verify using cosign
cosign verify ghcr.io/your-org/your-image:tag \
  --certificate-identity-regexp="https://github.com/your-org/your-repo" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

### Verify SBOM Attestation

```bash
# Verify CycloneDX SBOM
cosign verify-attestation ghcr.io/your-org/your-image:tag \
  --type cyclonedx \
  --certificate-identity-regexp="https://github.com/your-org/your-repo" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

# Verify SPDX SBOM
cosign verify-attestation ghcr.io/your-org/your-image:tag \
  --type spdx \
  --certificate-identity-regexp="https://github.com/your-org/your-repo" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

### Verify SLSA Provenance

```bash
# Verify provenance attestation
cosign verify-attestation ghcr.io/your-org/your-image:tag \
  --type slsaprovenance \
  --certificate-identity-regexp="https://github.com/your-org/your-repo" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

# Using slsa-verifier (official tool)
slsa-verifier verify-image ghcr.io/your-org/your-image:tag \
  --source-uri github.com/your-org/your-repo
```

### Automated Verification Script

```bash
# Use the provided verification script
./scripts/security/verify-slsa-l3.sh ghcr.io/your-org/your-image:tag
```

### Extract SBOM

```bash
# Download and view SBOM
cosign download attestation ghcr.io/your-org/your-image:tag \
  | jq -r '.payload' | base64 -d | jq .
```

---

## Air-Gapped Deployments

### Bundle Contents

The air-gapped bundle includes:

```
airgap-bundle/
├── images/
│   ├── intelgraph-server.tar       # OCI image archive
│   └── intelgraph-server.tar.sha256
├── sbom/
│   ├── sbom.cdx.json               # CycloneDX SBOM
│   ├── sbom.spdx.json              # SPDX SBOM
│   └── *.sha256                    # Hash files
├── signatures/
│   ├── image.sig                   # Cosign signature
│   └── attestations.json           # All attestations
├── security/
│   ├── vulnerability-report.json   # Grype scan results
│   └── security-summary.json       # Summary metrics
├── tools/
│   ├── bin/
│   │   ├── cosign                  # Cosign binary
│   │   └── slsa-verifier           # SLSA verifier
│   └── verify-bundle.sh            # Verification script
├── docs/
│   └── INSTALLATION.md             # Installation guide
└── manifest.json                   # Bundle manifest
```

### Installation in Air-Gapped Environment

1. **Transfer the bundle** using approved media (USB, DVD, etc.)

2. **Verify bundle integrity**:
   ```bash
   sha256sum -c intelgraph-airgap-bundle-*.sha256
   ```

3. **Run verification script**:
   ```bash
   cd airgap-bundle
   ./tools/verify-bundle.sh
   ```

4. **Load container image**:
   ```bash
   docker load -i images/intelgraph-server.tar
   ```

5. **Tag for local registry** (if applicable):
   ```bash
   docker tag <loaded-image> your-registry.internal/intelgraph:version
   docker push your-registry.internal/intelgraph:version
   ```

### FIPS 140-2 Compliance

When `fips_mode=true`:
- Build uses FIPS-validated cryptographic modules
- TLS configuration enforces FIPS-approved algorithms
- Container base image includes FIPS OpenSSL

---

## Troubleshooting

### Common Issues

#### Signature Verification Failed

```
Error: no matching signatures found
```

**Cause**: The image was not signed, or the identity doesn't match.

**Solution**:
1. Ensure the image was built with the SLSA workflow
2. Check the certificate identity pattern matches your repository
3. Verify you're using the correct OIDC issuer

#### SBOM Attestation Not Found

```
Error: no matching attestations found
```

**Cause**: SBOM was not attached during build.

**Solution**:
1. Check workflow logs for SBOM generation step
2. Ensure `sbom: true` is set in the workflow
3. Verify the image was pushed (PRs don't push)

#### SLSA Verifier Fails

```
Error: expected source 'github.com/org/repo' but got 'github.com/other/repo'
```

**Cause**: Source repository mismatch.

**Solution**:
1. Verify you're checking the correct image
2. Check the `--source-uri` parameter

### Debug Commands

```bash
# List all signatures and attestations
cosign tree ghcr.io/your-org/your-image:tag

# Download raw attestation
cosign download attestation ghcr.io/your-org/your-image:tag

# Inspect image manifest
docker manifest inspect ghcr.io/your-org/your-image:tag

# Check signing identity
cosign verify ghcr.io/your-org/your-image:tag --output text
```

---

## Compliance Matrix

### SLSA v1.0 Requirements Mapping

| Track | Requirement | Level 1 | Level 2 | Level 3 | Our Implementation |
|-------|-------------|---------|---------|---------|-------------------|
| **Build** | Scripted build | ✅ | ✅ | ✅ | Dockerfile + GHA |
| **Build** | Build service | | ✅ | ✅ | GitHub Actions |
| **Build** | Build as code | | | ✅ | Workflows in repo |
| **Build** | Ephemeral environment | | | ✅ | Fresh GHA runners |
| **Build** | Isolated | | | ✅ | Buildx network=none |
| **Build** | Parameterless | | | ✅ | No manual inputs |
| **Source** | Version controlled | ✅ | ✅ | ✅ | Git |
| **Source** | Verified history | | | ✅ | Commit signing |
| **Source** | Retained 18mo | ✅ | ✅ | ✅ | GH retention |
| **Source** | Two-person reviewed | | | ✅ | PR reviews |
| **Provenance** | Available | ✅ | ✅ | ✅ | SLSA attestation |
| **Provenance** | Authenticated | | ✅ | ✅ | OIDC keyless |
| **Provenance** | Service generated | | ✅ | ✅ | slsa-generator |
| **Provenance** | Non-falsifiable | | | ✅ | Signed by builder |
| **Provenance** | Dependencies | | | ✅ | SBOM included |

### Attestation Types

| Type | Format | Purpose |
|------|--------|---------|
| Image Signature | Cosign | Verify image authenticity |
| CycloneDX SBOM | in-toto | Software bill of materials |
| SPDX SBOM | in-toto | License and dependency info |
| SLSA Provenance | in-toto v1 | Build provenance |
| Vulnerability Scan | Custom | Security findings |

---

## Trade-offs

### Build Time Impact

| Configuration | Build Time Delta |
|---------------|------------------|
| Basic build | Baseline |
| + SBOM generation | +30-60 seconds |
| + Cosign signing | +10-20 seconds |
| + SLSA provenance | +60-90 seconds |
| + Vulnerability scan | +60-120 seconds |
| **Total overhead** | **+2-5 minutes** |

### Storage Impact

| Artifact | Size |
|----------|------|
| CycloneDX SBOM | ~500KB-2MB |
| SPDX SBOM | ~500KB-2MB |
| SLSA Provenance | ~5-10KB |
| Signatures | ~2-5KB |
| **Total per build** | **~1-5MB** |

### Benefits vs. Costs

| Benefit | Cost |
|---------|------|
| Supply chain security | +5 min build time |
| Compliance (FedRAMP, SOC2) | Storage for attestations |
| Vulnerability visibility | Tooling maintenance |
| Incident response capability | Learning curve |

---

## References

- [SLSA Specification](https://slsa.dev/spec/v1.0/)
- [Sigstore Documentation](https://docs.sigstore.dev/)
- [Cosign GitHub](https://github.com/sigstore/cosign)
- [SLSA GitHub Generator](https://github.com/slsa-framework/slsa-github-generator)
- [in-toto Attestation Framework](https://in-toto.io/)
- [CycloneDX Specification](https://cyclonedx.org/)
- [SPDX Specification](https://spdx.dev/)

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-29 | 1.0.0 | Initial SLSA L3 implementation |
