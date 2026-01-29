# GA Evidence Pack with OIDC Attestations

**Status:** Active
**Owner:** Platform Engineering
**Last Updated:** 2026-01-23

## Overview

The GA Evidence Pack is a cryptographically verifiable bundle containing all verification evidence required for GA release compliance. It includes:

- **Evidence Bundle**: CI, security, governance, and audit evidence
- **SBOM**: Software Bill of Materials (CycloneDX and SPDX formats)
- **Checksums**: SHA256 hash ledger of all artifacts
- **Attestations**: OIDC-signed attestations using Sigstore/cosign
- **Verification Instructions**: Complete verification runbook

### Key Properties

- ✅ **Deterministic**: Reproducible builds when using `SOURCE_DATE_EPOCH`
- ✅ **Cryptographically Verifiable**: OIDC keyless signing with GitHub Actions
- ✅ **Non-Publishing**: Attestations stored as artifacts, no automatic publishing
- ✅ **Least-Privilege**: Minimal permissions, `id-token: write` only where needed
- ✅ **Audit-Grade**: Complete audit trail via Rekor transparency log

---

## Architecture

### Components

```
GA Evidence Pack
├── Evidence Generation (scripts/release/generate_ga_evidence_pack.sh)
│   ├── Collect evidence from all sources
│   ├── Generate SBOM (CycloneDX + SPDX)
│   ├── Create checksums (evidence.sha256)
│   └── Produce manifest.json
│
├── Attestation (scripts/release/attest_ga_evidence.sh)
│   ├── SLSA provenance attestation
│   ├── SBOM attestations (both formats)
│   └── Verification instructions
│
└── Verification (scripts/release/verify_ga_evidence_attestations.sh)
    ├── Verify attestation signatures
    ├── Validate OIDC identity
    └── Check artifact integrity
```

### Trust Model

**Trust Anchor:**
- **OIDC Issuer**: `https://token.actions.githubusercontent.com`
- **Repository**: GitHub repository identity from workflow
- **Workflow**: `.github/workflows/ga-evidence-attest.yml`
- **Transparency Log**: Rekor (public, append-only ledger)

**What is Guaranteed:**
- ✅ Attestations signed with GitHub OIDC (keyless)
- ✅ Signatures bound to specific artifact digests
- ✅ Workflow identity verified
- ✅ Transparency log entry for auditability

**What is NOT Guaranteed:**
- ❌ Correctness of the workflow itself (requires code review)
- ❌ Completeness of evidence collection (requires policy enforcement)
- ❌ Protection against compromised repository or workflow
- ❌ Automatic security policy enforcement (requires admission controller)

---

## Output Structure

```
dist/ga-evidence/
├── evidence-bundle/                    # Evidence files
│   ├── ci/                             # CI evidence (builds, tests, lints)
│   ├── security/                       # Security evidence (audits, scans)
│   ├── governance/                     # Governance state files
│   └── audits/                         # Fresh audit runs
│
├── sbom.cdx.json                       # SBOM (CycloneDX)
├── sbom.spdx.json                      # SBOM (SPDX)
├── evidence.sha256                     # SHA256 checksums (attestable)
├── manifest.json                       # Pack metadata
├── ga-evidence.tgz                     # (optional) Tarball
│
└── attestations/                       # Attestations (OIDC-signed)
    ├── provenance.intoto.jsonl         # Provenance attestation
    ├── sbom-cdx.intoto.jsonl           # CycloneDX SBOM attestation
    ├── sbom-spdx.intoto.jsonl          # SPDX SBOM attestation
    ├── attestation-manifest.json       # Attestation metadata
    └── verify.md                       # Verification instructions
```

---

## Usage

### 1. Generate Evidence Pack Locally

```bash
# Generate evidence pack with SBOM
./scripts/release/generate_ga_evidence_pack.sh \
  --output dist/ga-evidence \
  --tarball \
  --verbose

# Verify checksums
sha256sum -c dist/ga-evidence/evidence.sha256
```

### 2. Generate Attestations (CI Only)

Attestations require GitHub OIDC tokens and should only be generated in CI:

```bash
# In GitHub Actions with id-token: write permission
./scripts/release/attest_ga_evidence.sh \
  --evidence-dir dist/ga-evidence \
  --verbose
```

### 3. Verify Attestations

```bash
# Verify all attestations and checksums
./scripts/release/verify_ga_evidence_attestations.sh \
  --evidence-dir dist/ga-evidence \
  --expected-repo BrianCLong/summit \
  --verbose
```

### 4. Manual Verification (cosign)

```bash
cd dist/ga-evidence/attestations

# Verify provenance attestation
cosign verify-blob-attestation \
  --certificate-identity-regexp "https://github.com/BrianCLong/summit/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type slsaprovenance \
  --bundle provenance.intoto.jsonl \
  ../evidence.sha256
```

---

## CI Workflow

### Workflow: `.github/workflows/ga-evidence-attest.yml`

**Triggers:**
- `workflow_dispatch` (primary)
- Optionally on push to `main` (commented out by default)

**Jobs:**

#### Job 1: `generate-pack` (No Special Permissions)
```yaml
permissions:
  contents: read
  issues: read
```

**Steps:**
1. Checkout repository
2. Install dependencies (pnpm, Node, syft, gitleaks)
3. Run `generate_ga_evidence_pack.sh`
4. Upload evidence pack artifact

#### Job 2: `attest` (OIDC Signing)
```yaml
permissions:
  contents: read
  id-token: write  # CRITICAL: Required for OIDC signing
```

**Steps:**
1. Download evidence pack from Job 1
2. Install cosign
3. Run `attest_ga_evidence.sh` (generates attestations)
4. Run `verify_ga_evidence_attestations.sh` (self-verify)
5. Upload attestations artifact

#### Job 3: `summary`
Generates workflow summary with verification instructions.

### Permissions Model

```yaml
# Top-level (default): read-only
permissions:
  contents: read

# generate-pack job: evidence collection only
permissions:
  contents: read
  issues: read

# attest job: OIDC signing only
permissions:
  contents: read
  id-token: write  # ← Only job with write permission
```

---

## Verification Procedures

### Quick Verification

```bash
# 1. Download artifact from GitHub Actions
# 2. Extract to local directory
cd ga-evidence-complete-<run-id>/

# 3. Verify checksums
sha256sum -c evidence.sha256

# 4. Verify attestations
./attestations/verify.sh
# OR use verification script:
cd .. && ./scripts/release/verify_ga_evidence_attestations.sh --evidence-dir ga-evidence-complete-<run-id>
```

### Detailed Verification

```bash
# 1. Verify provenance attestation
cosign verify-blob-attestation \
  --certificate-identity-regexp "https://github.com/BrianCLong/summit/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type slsaprovenance \
  --bundle attestations/provenance.intoto.jsonl \
  evidence.sha256

# 2. Verify CycloneDX SBOM attestation
cosign verify-blob-attestation \
  --certificate-identity-regexp "https://github.com/BrianCLong/summit/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type cyclonedx \
  --bundle attestations/sbom-cdx.intoto.jsonl \
  sbom.cdx.json

# 3. Verify SPDX SBOM attestation
cosign verify-blob-attestation \
  --certificate-identity-regexp "https://github.com/BrianCLong/summit/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type spdx \
  --bundle attestations/sbom-spdx.intoto.jsonl \
  sbom.spdx.json

# 4. Inspect attestation metadata
cat attestations/attestation-manifest.json | jq .
```

### Identity Verification

Extract and verify the signing certificate identity:

```bash
# Extract certificate from attestation
cosign verify-blob-attestation \
  --insecure-ignore-tlog \
  --certificate-identity-regexp ".*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type slsaprovenance \
  --bundle attestations/provenance.intoto.jsonl \
  evidence.sha256 2>&1 | grep -i "certificate"
```

Expected output should include:
- **Issuer**: `https://token.actions.githubusercontent.com`
- **Subject**: `https://github.com/BrianCLong/summit/.github/workflows/ga-evidence-attest.yml@refs/...`

---

## Determinism

### Enabling Deterministic Builds

Set `SOURCE_DATE_EPOCH` to ensure reproducible builds:

```bash
# Use git commit timestamp
export SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)

# Generate evidence pack
./scripts/release/generate_ga_evidence_pack.sh --output dist/ga-evidence

# Verify determinism
./scripts/release/generate_ga_evidence_pack.sh --check-determinism
```

### What is Deterministic

- ✅ Evidence file contents (from stable sources)
- ✅ SBOM generation (when using same version of syft)
- ✅ Checksums (evidence.sha256)
- ✅ Tarball (when using --mtime with SOURCE_DATE_EPOCH)

### What is NOT Deterministic

- ❌ Timestamps in manifest.json (unless SOURCE_DATE_EPOCH is set)
- ❌ Attestation signatures (unique per run, by design)
- ❌ Evidence that includes timestamps (e.g., workflow run IDs)

---

## Security Considerations

### Threat Model

**Protected Against:**
- ✅ Unauthorized attestation generation (OIDC identity)
- ✅ Attestation tampering (cryptographic signatures)
- ✅ Hidden attestation activity (Rekor transparency log)
- ✅ Certificate replay attacks (short-lived certs)

**NOT Protected Against:**
- ❌ Compromised GitHub Actions runner
- ❌ Compromised repository with write access
- ❌ Compromised workflow YAML
- ❌ Supply chain attacks on dependencies

### Mitigations

1. **Repository Protection**: Use branch protection, required reviews, CODEOWNERS
2. **Workflow Pinning**: Pin all actions to SHA (not tags)
3. **Dependency Scanning**: Use Dependabot, audit on every build
4. **Policy Enforcement**: Use admission controllers (e.g., Kyverno, Gatekeeper) to enforce attestation verification in deployment pipelines

---

## Troubleshooting

### cosign not found

Install cosign:

```bash
# macOS
brew install cosign

# Linux
wget https://github.com/sigstore/cosign/releases/download/v2.2.4/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
```

### "ACTIONS_ID_TOKEN_REQUEST_URL not set"

Ensure workflow has `id-token: write` permission:

```yaml
permissions:
  id-token: write
  contents: read
```

### "no matching certificate found"

The certificate identity doesn't match the expected pattern. Extract the actual identity:

```bash
cosign verify-blob-attestation \
  --insecure-ignore-tlog \
  --certificate-identity-regexp ".*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type slsaprovenance \
  --bundle provenance.intoto.jsonl \
  ../evidence.sha256 2>&1 | grep "certificate identity"
```

Adjust the `--certificate-identity-regexp` to match the actual identity.

### "signature verification failed"

The artifact or attestation has been modified. Verify:

1. Files were not modified after attestation
2. Correct attestation bundle for the artifact
3. Artifact digest matches

---

## References

### Internal Documentation
- [Evidence Collection](../ci/EVIDENCE_COLLECTION.md)
- [Release Runbook](runbook.md)
- [GA Evidence Index](GA_EVIDENCE_INDEX.md)

### External Resources
- [Sigstore Documentation](https://docs.sigstore.dev/)
- [SLSA Framework](https://slsa.dev/)
- [SLSA Provenance Spec](https://slsa.dev/provenance/v1)
- [In-toto Attestation Format](https://github.com/in-toto/attestation)
- [GitHub OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Rekor Transparency Log](https://docs.sigstore.dev/rekor/overview/)

---

## Change Log

| Date       | Change                                  | Author               |
| ---------- | --------------------------------------- | -------------------- |
| 2026-01-23 | Initial GA Evidence Pack with OIDC      | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-23 (or before next GA release)
