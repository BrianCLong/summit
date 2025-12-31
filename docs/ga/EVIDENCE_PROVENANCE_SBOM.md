# Evidence Pack: Provenance and SBOM

**Document Version**: 1.0.0
**Last Updated**: 2025-12-31
**Related**: [GA Provenance and SBOM Contract](./PROVENANCE_AND_SBOM.md)

---

## Purpose

This document provides **step-by-step instructions** to generate, verify, and audit provenance and SBOM artifacts for the Summit platform. It serves as the **evidence pack** for compliance reviews, audits, and release verification.

---

## Prerequisites

- Node.js 20.x
- pnpm 10.0.0
- Git repository access
- Build artifacts (`pnpm build` completed)

---

## Quick Start

```bash
# Generate SBOM and Provenance
pnpm generate:sbom
pnpm generate:provenance

# Verify artifacts
pnpm verify:provenance
```

---

## 1. Generation Commands

### 1.1 Generate SBOM

**Command**:
```bash
pnpm generate:sbom
```

**What it does**:
- Enumerates all production dependencies via `pnpm list --prod`
- Enriches package metadata with license information
- Generates CycloneDX 1.5 SBOM
- Generates SPDX 2.3 SBOM

**Output Locations**:
- `sbom/intelgraph-platform-4.0.1-sbom-cyclonedx.json`
- `sbom/intelgraph-platform-4.0.1-sbom-spdx.json`

**Options**:
```bash
# Include development dependencies
pnpm generate:sbom -- --dev

# Generate only CycloneDX format
pnpm generate:sbom -- --cyclonedx

# Generate only SPDX format
pnpm generate:sbom -- --spdx

# Custom output directory
pnpm generate:sbom -- --output ./custom-dir
```

**Expected Output**:
```
========================================
     SBOM GENERATOR
========================================
Format: both
Include dev deps: false
Output directory: sbom

Collecting package information...
Found 487 packages
Enriching package information with license data...
CycloneDX SBOM written to: sbom/intelgraph-platform-4.0.1-sbom-cyclonedx.json
SPDX SBOM written to: sbom/intelgraph-platform-4.0.1-sbom-spdx.json

--- License Breakdown ---
  MIT: 342
  Apache-2.0: 67
  ISC: 23
  BSD-3-Clause: 18
  ...

========================================
✅ SBOM generation complete
========================================
```

---

### 1.2 Generate Provenance

**Command**:
```bash
pnpm generate:provenance
```

**What it does**:
- Collects Git metadata (commit, branch, repository)
- Hashes all build artifacts (server/dist, client/dist)
- Generates SLSA v1.0 provenance attestation
- Includes lock file hash and build metadata

**Output Location**:
- `dist/provenance/build-provenance.intoto.jsonl`

**Expected Output**:
```
========================================
     SLSA PROVENANCE GENERATOR
========================================

✅ SLSA provenance generated: dist/provenance/build-provenance.intoto.jsonl
📦 Subjects: 142 artifacts
🔗 Commit: a3f2b8c1
🌿 Branch: main

========================================
✅ Provenance generation complete
========================================
```

---

## 2. Verification Commands

### 2.1 Verify Provenance and SBOM

**Command**:
```bash
pnpm verify:provenance
```

**What it verifies**:
1. SBOM files exist at expected paths
2. SBOM schema validity (CycloneDX 1.5, SPDX 2.3)
3. Provenance file exists
4. Provenance references correct Git commit
5. Provenance includes build command and materials
6. Artifact hashes match provenance subjects
7. No required fields are empty

**Expected Output (Success)**:
```
========================================
  PROVENANCE & SBOM VERIFICATION
========================================

📦 Verifying SBOM existence...
🔍 Verifying SBOM schema...
📜 Verifying provenance existence...
🔍 Verifying provenance schema...
🔗 Verifying provenance commit...
🔐 Verifying artifact hashes...

========================================
  VERIFICATION RESULTS
========================================

✅ CycloneDX SBOM exists
✅ SPDX SBOM exists
✅ CycloneDX SBOM schema valid (487 components)
✅ SPDX SBOM schema valid
✅ SLSA provenance exists
✅ Provenance has 142 subjects
✅ Provenance schema valid
✅ Provenance references correct commit (a3f2b8c1)
✅ All 142 artifact hashes verified

========================================
✅ Passed: 9/9
❌ Failed: 0/9
========================================

✅ VERIFICATION PASSED
```

**Expected Output (Failure Example)**:
```
========================================
  VERIFICATION RESULTS
========================================

✅ CycloneDX SBOM exists
❌ SPDX SBOM not found
   Expected file: sbom/intelgraph-platform-4.0.1-sbom-spdx.json
❌ Hash mismatch for server/dist/index.js
   Expected: a3f2b8c12def4567..., Got: b4e3c9d23afe5678...

========================================
✅ Passed: 7/9
❌ Failed: 2/9
========================================

❌ VERIFICATION FAILED
```

---

## 3. Sample Filenames and Locations

### 3.1 SBOM Artifacts

| Format | Filename | Location |
|--------|----------|----------|
| CycloneDX | `intelgraph-platform-4.0.1-sbom-cyclonedx.json` | `sbom/` |
| SPDX | `intelgraph-platform-4.0.1-sbom-spdx.json` | `sbom/` |

### 3.2 Provenance Artifacts

| Format | Filename | Location |
|--------|----------|----------|
| SLSA v1.0 | `build-provenance.intoto.jsonl` | `dist/provenance/` |

### 3.3 Build Artifacts

| Artifact | Location |
|----------|----------|
| Server build | `server/dist/` |
| Client build | `client/dist/` |
| Lock file | `pnpm-lock.yaml` |

---

## 4. Reproducibility

### 4.1 Reproduce Locally

To reproduce the exact same build and provenance:

```bash
# 1. Checkout the specific commit
git checkout <commit-sha>

# 2. Install dependencies (frozen lockfile)
pnpm install --frozen-lockfile

# 3. Set deterministic build timestamp
export SOURCE_DATE_EPOCH=$(git log -1 --pretty=format:%ct)

# 4. Build artifacts
pnpm build

# 5. Generate SBOM and provenance
pnpm generate:sbom
pnpm generate:provenance

# 6. Verify
pnpm verify:provenance
```

### 4.2 Compare Builds

To verify reproducibility:

```bash
# First build
pnpm build
find server/dist client/dist -type f -print0 | sort -z | xargs -0 sha256sum > checksums-1.txt

# Clean and rebuild
rm -rf server/dist client/dist
pnpm build
find server/dist client/dist -type f -print0 | sort -z | xargs -0 sha256sum > checksums-2.txt

# Compare
diff checksums-1.txt checksums-2.txt
```

**Expected**: No differences (builds are bit-for-bit identical).

---

## 5. CI/CD Integration

### 5.1 GitHub Actions Workflow

The provenance and SBOM generation is enforced in CI via:

**Workflow**: `.github/workflows/ci.yml`
**Job**: `provenance` (GA-blocking)

**Steps**:
1. Checkout code
2. Install dependencies
3. Build artifacts with `SOURCE_DATE_EPOCH`
4. Generate SBOM
5. Generate provenance
6. Verify artifacts
7. Upload SBOM and provenance as artifacts

**Failure Conditions**:
- SBOM generation fails
- Provenance generation fails
- Verification fails (schema, hashes, missing files)

---

## 6. Inspection and Audit

### 6.1 Inspect SBOM

```bash
# View CycloneDX SBOM
cat sbom/intelgraph-platform-4.0.1-sbom-cyclonedx.json | jq .

# Count components
cat sbom/intelgraph-platform-4.0.1-sbom-cyclonedx.json | jq '.components | length'

# List all component names
cat sbom/intelgraph-platform-4.0.1-sbom-cyclonedx.json | jq '.components[].name'

# Find packages with specific license
cat sbom/intelgraph-platform-4.0.1-sbom-cyclonedx.json | jq '.components[] | select(.licenses[].license.id == "MIT") | .name'
```

### 6.2 Inspect Provenance

```bash
# View provenance
cat dist/provenance/build-provenance.intoto.jsonl | jq .

# Extract commit hash
cat dist/provenance/build-provenance.intoto.jsonl | jq -r '.predicate.buildDefinition.externalParameters.commit'

# List all subjects (artifacts)
cat dist/provenance/build-provenance.intoto.jsonl | jq '.subject[].name'

# Verify specific artifact hash
cat dist/provenance/build-provenance.intoto.jsonl | jq '.subject[] | select(.name == "server/dist/index.js")'
```

---

## 7. Known Limitations

### 7.1 Dependency Enumeration

**Limitation**: Transitive peer dependencies with ambiguous resolution may be incomplete.

**Rationale**: pnpm workspace hoisting can cause some peer dependencies to be satisfied implicitly.

**Mitigation**: All direct and declared transitive dependencies are tracked. Peer dependency gaps are rare and non-critical.

---

### 7.2 Timestamp Determinism

**Limitation**: Without `SOURCE_DATE_EPOCH`, SBOM timestamps are non-deterministic.

**Rationale**: Default behavior uses current system time.

**Mitigation**: CI enforces `SOURCE_DATE_EPOCH` for all builds. Local builds should also set this variable.

---

### 7.3 UUID Non-Determinism

**Limitation**: SBOM `serialNumber` is a random UUID and differs between runs.

**Rationale**: CycloneDX spec requires unique serial numbers.

**Mitigation**: Verification does NOT check UUID consistency. Only structural and hash verification matters.

---

### 7.4 License Detection

**Limitation**: Some packages may report "UNKNOWN" license.

**Rationale**: License detection relies on package.json declarations and may fail for packages without proper metadata.

**Mitigation**: Manual review of UNKNOWN licenses is recommended for compliance-sensitive environments.

---

## 8. Troubleshooting

### 8.1 "SBOM generation failed"

**Cause**: `pnpm list` command failed or license-checker not found.

**Solution**:
```bash
# Reinstall dependencies
pnpm install

# Verify pnpm works
pnpm list --prod
```

---

### 8.2 "Provenance generation failed: No build artifacts found"

**Cause**: Build artifacts (`server/dist`, `client/dist`) do not exist.

**Solution**:
```bash
# Build first
pnpm build

# Then generate provenance
pnpm generate:provenance
```

---

### 8.3 "Hash mismatch for artifact"

**Cause**: Build artifacts have been modified since provenance generation.

**Solution**:
```bash
# Regenerate provenance
pnpm generate:provenance

# Or rebuild and regenerate
pnpm build && pnpm generate:provenance
```

---

### 8.4 "Provenance commit mismatch"

**Cause**: Provenance was generated from a different commit than the current HEAD.

**Solution**:
```bash
# Regenerate provenance from current commit
pnpm generate:provenance
```

---

## 9. Compliance Checklist

Use this checklist for release audits:

- [ ] Build is deterministic (`pnpm build` twice produces identical checksums)
- [ ] SBOM generated successfully
- [ ] SBOM includes all production dependencies
- [ ] SBOM license data is present (no critical UNKNOWN licenses)
- [ ] Provenance generated successfully
- [ ] Provenance references correct commit SHA
- [ ] Provenance includes lock file hash
- [ ] All artifact hashes match provenance subjects
- [ ] Verification passes (`pnpm verify:provenance`)
- [ ] SBOM and provenance uploaded to artifact storage

---

## 10. References

- **GA Contract**: [PROVENANCE_AND_SBOM.md](./PROVENANCE_AND_SBOM.md)
- **SLSA Framework**: https://slsa.dev/
- **CycloneDX**: https://cyclonedx.org/
- **SPDX**: https://spdx.dev/

---

## 11. Contact

**Questions or Issues**: Open an issue in the repository or contact Platform Engineering.

---

**END OF EVIDENCE PACK**
