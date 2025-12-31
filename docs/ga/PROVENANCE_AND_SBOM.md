# Provenance and SBOM Contract (GA Release)

**Document Version**: 1.0.0
**Effective Date**: 2025-12-31
**Status**: Authoritative

---

## Executive Summary

This document defines the **canonical contract** for Software Bill of Materials (SBOM) and build provenance artifacts at General Availability (GA). It specifies:

- **What is guaranteed** at GA release
- **What artifacts are covered**
- **What formats and standards are used**
- **What is explicitly out of scope**

This is a **hard requirement** for GA release. All claims in this document map to verifiable scripts and CI workflows.

---

## 1. Scope of Coverage

### 1.1 Artifacts Covered at GA

The following artifacts **MUST** have SBOM and provenance data:

| Artifact | Description | Build Output |
|----------|-------------|--------------|
| **Server** | Node.js backend API | `server/dist/` |
| **Client** | Vite-built frontend | `client/dist/` |
| **Container Images** | Docker images for deployment | `Dockerfile`, `Dockerfile.optimized` |
| **Release Bundles** | Tarball/zip archives | `.tar.gz`, `.zip` |

### 1.2 Artifacts NOT Covered at GA

The following are **explicitly out of scope** at GA:

- **Development dependencies** (only production dependencies are tracked)
- **Transitive peer dependencies** with resolution ambiguities in pnpm workspaces
- **Local/uncommitted changes** (only committed code is provenance-tracked)
- **Third-party container base images** (base image provenance is inherited, not generated)
- **Binary blobs** in `vendor/` or similar directories without package manager metadata

---

## 2. SBOM Format and Standards

### 2.1 Primary Format: CycloneDX

**Format**: CycloneDX JSON
**Specification Version**: 1.5
**Standard**: https://cyclonedx.org/specification/overview/

**Guaranteed Fields**:
- `bomFormat`: "CycloneDX"
- `specVersion`: "1.5"
- `serialNumber`: Unique URN (urn:uuid:...)
- `metadata.timestamp`: ISO 8601 timestamp
- `metadata.component`: Root component (application)
- `components[]`: All production dependencies
- `dependencies[]`: Dependency relationships (best-effort)

**Component Metadata**:
- Package name and version
- Package URL (purl) for npm packages
- License information (SPDX identifier where available)
- Repository URL (when available)

### 2.2 Secondary Format: SPDX

**Format**: SPDX JSON
**Specification Version**: 2.3
**Standard**: https://spdx.dev/

Generated for compliance and interoperability. Contains the same dependency data as CycloneDX.

---

## 3. Provenance Format and Standards

### 3.1 Provenance Format: SLSA v1.0

**Format**: SLSA Provenance (in-toto attestation)
**Specification**: SLSA Provenance v1.0
**Standard**: https://slsa.dev/spec/v1.0/provenance

**Guaranteed Predicate Fields**:
- `buildDefinition.buildType`: Build type URI
- `buildDefinition.externalParameters`: Git ref, repository
- `buildDefinition.resolvedDependencies`: Lock file hashes
- `runDetails.builder.id`: Builder identity
- `runDetails.metadata.invocationId`: Unique build ID
- `runDetails.metadata.startedOn`: ISO 8601 build start time

**Artifact Subjects**:
- File path (relative to repository root)
- SHA-256 digest
- File size (bytes)

### 3.2 Build Guarantees

At GA, the following are **guaranteed** in provenance:

1. **Source Identity**
   - Repository: `https://github.com/BrianCLong/summit`
   - Git commit SHA (full 40-character hash)
   - Git ref (branch/tag)

2. **Build Command Identity**
   - Build command: `pnpm build`
   - Build environment: Node.js 20.x, pnpm 10.0.0
   - Build timestamp: ISO 8601 with timezone

3. **Dependency Enumeration**
   - Lock file hash: SHA-256 of `pnpm-lock.yaml`
   - All production dependencies from `pnpm list --json --prod`

4. **Artifact Integrity**
   - SHA-256 digest of all output files
   - File paths relative to build output directory
   - Deterministic builds enforced via `SOURCE_DATE_EPOCH`

---

## 4. Hashing and Integrity

### 4.1 Hash Algorithm

**Algorithm**: SHA-256
**Encoding**: Hexadecimal lowercase

### 4.2 Hashed Artifacts

The following **MUST** be hashed in provenance:

- Source code snapshot (via Git commit SHA)
- Lock file (`pnpm-lock.yaml`)
- All build output files in `server/dist/` and `client/dist/`
- Container image layers (via Docker image digest)

---

## 5. What is Guaranteed

### 5.1 Reproducibility

**Guarantee**: Builds are **bit-for-bit reproducible** given:
- Same Git commit
- Same Node.js version
- Same pnpm version
- Same `SOURCE_DATE_EPOCH`

**Verification**: CI enforces reproducible builds via checksum comparison.

**Reference**: `.github/workflows/ci.yml` → `reproducible-build` job

### 5.2 Completeness

**Guarantee**: SBOM includes **all production dependencies** enumerated by `pnpm list --prod`.

**Limitation**: Transitive peer dependencies may be incomplete if pnpm resolution is ambiguous.

### 5.3 Accuracy

**Guarantee**: SBOM license data is sourced from `license-checker` and package manifests.

**Limitation**: License detection is best-effort. Some packages may report "UNKNOWN" or incorrect licenses if not declared in package.json.

### 5.4 Verifiability

**Guarantee**: All SBOM and provenance artifacts can be **verified locally** via:

```bash
pnpm generate:sbom
pnpm generate:provenance
pnpm verify:provenance
```

---

## 6. What is NOT Guaranteed (Explicit Out-of-Scope)

### 6.1 Monorepo Edge Cases

- **Workspace hoisting**: Some dependencies may be hoisted to the root `node_modules` and not explicitly declared.
- **Phantom dependencies**: Dependencies available at runtime but not declared in `package.json` are not tracked.

### 6.2 Peer Dependency Gaps

- Peer dependencies that are satisfied implicitly (e.g., by workspace structure) may not appear in SBOM.

### 6.3 Container Base Images

- Base images (e.g., `node:20-alpine`) are **not** scanned for vulnerabilities in this provenance pipeline.
- Base image SBOM is inherited from upstream (Docker Hub, etc.).

### 6.4 Runtime Dependencies

- Python packages (`pyproject.toml`) are **not** included in the Node.js SBOM.
- System-level dependencies (OS packages) are **not** tracked.

### 6.5 Signature/Attestation

- At GA, provenance is **generated** but **not cryptographically signed**.
- Signing with Sigstore/Cosign is a post-GA enhancement.

---

## 7. CI/CD Integration

### 7.1 Generation Pipeline

**Where**: `.github/workflows/ci.yml` → `provenance` job
**Trigger**: Every push to `main`, every pull request
**Command**: `pnpm generate:sbom && pnpm generate:provenance`

### 7.2 Verification Gate

**Where**: `.github/workflows/ci.yml` → `provenance` job
**Trigger**: Blocking gate for GA release
**Command**: `pnpm verify:provenance`
**Failure Condition**: Missing SBOM, malformed provenance, hash mismatch

### 7.3 Artifact Storage

**SBOM Output**: `sbom/*.json`
**Provenance Output**: `dist/provenance/*.intoto.jsonl`
**Evidence Bundle**: `dist/evidence-bundle.tar.gz` (checksums + SBOM + provenance)

---

## 8. Compliance Mapping

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| SBOM Generation | NTIA Minimum Elements | CycloneDX 1.5 with required fields |
| Provenance Tracking | SLSA L1 | SLSA v1.0 predicate with Git identity |
| Reproducible Builds | SLSA L2 | `SOURCE_DATE_EPOCH` enforcement |
| License Compliance | OSS Compliance | License enumeration via `license-checker` |

---

## 9. Versioning and Updates

- **Document Version**: Follows semantic versioning (MAJOR.MINOR.PATCH)
- **Breaking Changes**: Require MAJOR version bump
- **Backward Compatibility**: Older SBOM/provenance formats are not supported

---

## 10. Verification Commands

### 10.1 Generate SBOM

```bash
pnpm generate:sbom
```

**Output**: `sbom/intelgraph-platform-4.0.1-sbom-cyclonedx.json`

### 10.2 Generate Provenance

```bash
pnpm generate:provenance
```

**Output**: `dist/provenance/build-provenance.intoto.jsonl`

### 10.3 Verify Provenance and SBOM

```bash
pnpm verify:provenance
```

**Checks**:
- SBOM files exist
- SBOM schema validity
- Provenance file exists
- Provenance references correct Git commit
- Artifact hashes match provenance
- No required fields are empty

---

## 11. References

- **SLSA Framework**: https://slsa.dev/
- **CycloneDX Specification**: https://cyclonedx.org/
- **SPDX Specification**: https://spdx.dev/
- **NTIA SBOM Minimum Elements**: https://www.ntia.gov/sbom

---

## 12. Contact and Governance

**Document Owner**: Platform Engineering
**Review Cadence**: Quarterly
**Change Control**: PRs to this document require 2 approvals

---

**END OF DOCUMENT**
