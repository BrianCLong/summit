> **ARCHIVED: GA PROGRAM v1**
> This document is part of the GA Program v1 archive. It is read-only and no longer active.
> **Date:** 2026-01-25

# GA Evidence Bundle

**Status:** Active
**Owner:** Platform Engineering
**Last Updated:** 2026-01-23

## Overview

The GA Evidence Bundle is a comprehensive, deterministic collection of artifacts that prove release readiness for the Summit Platform. It includes:

- **SBOM** (Software Bill of Materials) in CycloneDX 1.5 format
- **Provenance metadata** describing build and verification context
- **Hash ledger** (SHA-256) for integrity verification
- **Verification reports** from the GA gate (typecheck, lint, build, test, smoke)

### Purpose

- **Audit Trail**: Provides verifiable evidence for compliance audits
- **Integrity Verification**: Every artifact is hashed and checksummed
- **Reproducibility**: Deterministic generation ensures identical outputs
- **Transparency**: Human-readable manifests and reports

---

## Quick Start

### Generate Evidence Bundle

```bash
node scripts/release/ga_evidence_pack.mjs
```

This will:
1. Run `pnpm ga:verify` and fail fast if any gate fails
2. Generate SBOM (CycloneDX 1.5)
3. Collect verification reports
4. Create evidence manifest
5. Generate SHA-256 hash ledger
6. Package as tarball

Output: `dist/ga-evidence/` and `dist/ga-evidence.tgz`

### Verify Determinism

```bash
node scripts/release/ga_evidence_pack.mjs --check-determinism
```

This runs the evidence pack generation **twice** and verifies that:
- Hash ledgers are identical
- All artifacts are deterministic
- No timestamps, random UUIDs, or locale-dependent sorting

---

## Evidence Bundle Contents

### File Structure

```
dist/ga-evidence/
├── GA_EVIDENCE_MANIFEST.yml   # Evidence manifest (what's included)
├── sbom.cdx.json              # Software Bill of Materials (CycloneDX 1.5)
├── ga_verify_report.json      # GA verification results (JSON)
├── ga_verify_report.md        # GA verification results (Markdown)
└── evidence.sha256            # SHA-256 hash ledger for all files
```

### Artifact Descriptions

| File | Description | Role | Required |
|------|-------------|------|----------|
| `GA_EVIDENCE_MANIFEST.yml` | Evidence manifest describing bundle contents | metadata | Yes |
| `sbom.cdx.json` | Software Bill of Materials (CycloneDX 1.5) | sbom | Yes |
| `ga_verify_report.json` | GA verification gate results (JSON format) | verification | Yes |
| `ga_verify_report.md` | GA verification gate results (Markdown format) | verification | No |
| `evidence.sha256` | SHA-256 hash ledger for integrity verification | integrity | Yes |

---

## SBOM Generation

The evidence pack uses **CycloneDX 1.5** format for SBOM generation.

### Tooling Priority

The script attempts to use the following tools in order:

1. **@cyclonedx/cyclonedx-npm** (preferred for Node.js projects)
2. **syft** (if installed)
3. **Minimal placeholder** (if no tool available)

### Installing SBOM Tools

To get full SBOM generation:

```bash
# Option 1: Install CycloneDX for Node.js
pnpm add -D @cyclonedx/cyclonedx-npm

# Option 2: Install syft (Anchore)
# See: https://github.com/anchore/syft#installation
```

### SBOM Format

The SBOM follows CycloneDX 1.5 specification:

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "metadata": {
    "component": {
      "type": "application",
      "name": "summit-platform",
      "version": "..."
    }
  },
  "components": [...]
}
```

---

## Determinism Guarantees

The evidence pack is **fully deterministic** with the following guarantees:

### What is Deterministic

- ✅ File paths sorted by codepoint ordering
- ✅ SHA-256 hashes computed consistently
- ✅ JSON output with stable key ordering
- ✅ No wall-clock timestamps in artifact contents
- ✅ Tarball created with `--mtime=1970-01-01` and `--sort=name`

### What is NOT Deterministic (by design)

- ❌ `stamp.json` from `ga:verify` contains runtime timestamps (intentional, for audit log)
- ❌ Git SHA changes with each commit (intentional, tied to code version)

### Timestamp Handling

- **Runtime timestamps** (like `startedAt`, `finishedAt`) are stored in `ga_verify_report.json` for audit purposes
- **Artifact generation** does NOT include timestamps to ensure reproducibility
- To verify determinism, use `--check-determinism` mode

---

## Verification and Integrity

### Verify Evidence Integrity

```bash
cd dist/ga-evidence
sha256sum -c evidence.sha256
```

This verifies that all files match their recorded SHA-256 hashes.

### Manual Hash Verification

```bash
# Verify a specific file
sha256sum dist/ga-evidence/sbom.cdx.json
grep sbom.cdx.json dist/ga-evidence/evidence.sha256
```

### Check SBOM Validity

```bash
# Validate JSON structure
jq empty dist/ga-evidence/sbom.cdx.json

# View SBOM metadata
jq '.metadata' dist/ga-evidence/sbom.cdx.json

# Count components
jq '.components | length' dist/ga-evidence/sbom.cdx.json
```

---

## Provenance and Attestations

### Current State: Evidence Only (No Signing)

The evidence bundle currently includes:

- ✅ SBOM (component inventory)
- ✅ Verification reports (gate results)
- ✅ Hash ledger (integrity)
- ✅ Provenance metadata (git SHA, branch, toolchain)

### What is NOT Included (Yet)

The evidence bundle does NOT include:

- ❌ Cryptographic attestations (cosign, OIDC)
- ❌ SLSA provenance (in-toto format)
- ❌ Signature verification (Sigstore, Rekor)

### Enabling Signing (Future)

To add cryptographic attestations:

1. **Install cosign**:
   ```bash
   # See: https://docs.sigstore.dev/cosign/installation/
   ```

2. **Configure OIDC in CI**:
   ```yaml
   permissions:
     id-token: write  # Required for OIDC
     contents: read
   ```

3. **Sign artifacts**:
   ```bash
   cosign sign-blob \
     --bundle evidence.bundle \
     dist/ga-evidence.tgz
   ```

4. **Verify signature**:
   ```bash
   cosign verify-blob \
     --bundle evidence.bundle \
     --certificate-identity ... \
     --certificate-oidc-issuer ... \
     dist/ga-evidence.tgz
   ```

See `docs/releases/PROVENANCE_SIGNING.md` (to be created) for full guidance.

---

## CI Integration

### Workflow: `ga-evidence-pack.yml`

The evidence pack is generated automatically in CI:

- **Trigger**: `workflow_dispatch` or push to `main`
- **Permissions**: `contents: read` (least-privilege)
- **Artifact Retention**: 90 days

### Workflow Steps

1. Checkout repository
2. Setup Node.js and pnpm
3. Install dependencies
4. Run evidence pack with determinism check
5. Upload evidence bundle as artifact
6. Verify evidence integrity

### Viewing CI Artifacts

After workflow runs:

1. Go to Actions → GA Evidence Pack
2. Click on the workflow run
3. Download artifact: `ga-evidence-bundle-<sha>`

---

## Command Reference

### Generate Evidence Bundle

```bash
node scripts/release/ga_evidence_pack.mjs
```

**Options:**
- `--output-dir DIR` - Custom output directory (default: `dist/ga-evidence`)
- `--check-determinism` - Run twice and verify outputs match
- `--help` - Show help message

### Examples

```bash
# Standard generation
node scripts/release/ga_evidence_pack.mjs

# Check determinism
node scripts/release/ga_evidence_pack.mjs --check-determinism

# Custom output directory
node scripts/release/ga_evidence_pack.mjs --output-dir /tmp/evidence

# View help
node scripts/release/ga_evidence_pack.mjs --help
```

---

## Troubleshooting

### Error: ga:verify failed

If the evidence pack generation fails with `ga:verify failed`, it means the codebase does not pass GA gates.

**Fix:**
1. Run `pnpm ga:verify` directly to see which gate failed
2. Fix the issue (typecheck, lint, build, test, or smoke)
3. Re-run evidence pack generation

### Error: SBOM not generated

If SBOM generation fails:

1. Install a supported SBOM tool:
   ```bash
   pnpm add -D @cyclonedx/cyclonedx-npm
   ```

2. Verify installation:
   ```bash
   npx @cyclonedx/cyclonedx-npm --version
   ```

3. Re-run evidence pack generation

### Error: Determinism check failed

If `--check-determinism` fails:

1. Check for timestamps in artifacts
2. Verify file ordering is stable
3. Check for random UUIDs or nonces
4. Review locale-dependent sorting

---

## Future Enhancements

Planned improvements:

- [ ] SLSA provenance (in-toto format)
- [ ] Cryptographic attestations (cosign + OIDC)
- [ ] Vulnerability scan results in evidence bundle
- [ ] Container image SBOMs (if applicable)
- [ ] Attestation verification in CI

---

## References

- [CycloneDX 1.5 Specification](https://cyclonedx.org/docs/1.5/json/)
- [SLSA Provenance](https://slsa.dev/provenance/)
- [Sigstore Documentation](https://docs.sigstore.dev/)
- [GA Verification Guide](GA_VERIFY.md)
- [Bundle SBOM Format](BUNDLE_SBOM.md)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-23 | Initial GA Evidence Bundle implementation | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-23
