# Governance Signing

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

Governance Signing provides cryptographic **authenticity** for governance configuration using Sigstore/cosign with GitHub Actions OIDC identity. This extends the integrity guarantees from hashes to include verifiable proof that the governance lockfile was signed by an authorized CI workflow.

### Key Concepts

| Term                 | Description                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| **Subject**          | The file being signed: `governance/governance_SHA256SUMS`              |
| **Signature**        | Detached signature file: `governance_SHA256SUMS.sig`                   |
| **Certificate**      | X.509 certificate with OIDC identity: `governance_SHA256SUMS.cert`     |
| **Identity Pinning** | Verification that the signer matches expected OIDC issuer and workflow |

### Why Sign governance_SHA256SUMS?

Signing `governance_SHA256SUMS` (rather than individual files) provides:

1. **Complete coverage** - Covers the lockfile AND all snapshot policy files
2. **Single verification** - One signature to verify entire governance state
3. **Chain of custody** - SHA256SUMS links to lockfile which links to policies

---

## Identity Pinning

All governance signatures are verified with identity constraints to ensure they were created by authorized workflows.

### OIDC Issuer

```
https://token.actions.githubusercontent.com
```

This is the GitHub Actions OIDC issuer. Only tokens from GitHub Actions can create valid signatures.

### Identity Pattern

```regexp
https://github.com/.*/summit/.github/workflows/(ga-release|rc-release|build-ga-bundle|build-promotion-bundle).*
```

This restricts valid signers to specific release workflows in the summit repository.

### Policy File

Identity constraints are defined in `security/sigstore-identity-policy.yml`:

```yaml
governance_signing:
  oidc_issuer: "https://token.actions.githubusercontent.com"
  identity_regexp: "https://github.com/.*/summit/.github/workflows/(ga-release|rc-release).*"
  allowed_workflows:
    - ".github/workflows/ga-release.yml"
    - ".github/workflows/rc-release.yml"
```

---

## Signing Process

### Prerequisites

Signing requires:

- GitHub Actions workflow with `id-token: write` permission
- `cosign` installed (auto-installed if missing)

### Workflow Integration

In release workflows, add the id-token permission:

```yaml
permissions:
  id-token: write
  contents: read
```

The signing happens automatically in `build-ga-bundle.sh` and `build-promotion-bundle.sh` after governance lockfile generation.

### Manual Signing

```bash
# Sign governance checksums
./scripts/release/sign_governance_lockfile.sh \
  --mode sign \
  --subject governance/governance_SHA256SUMS \
  --out-dir governance/signatures \
  --tag v4.1.2 \
  --sha abc123
```

### Output Files

After signing, the `governance/signatures/` directory contains:

```
governance/signatures/
├── governance_SHA256SUMS.sig    # Detached signature
├── governance_SHA256SUMS.cert   # Certificate with OIDC identity
└── metadata.json                # Signing metadata
```

### Metadata Format

```json
{
  "version": "1.0.0",
  "method": "sigstore-cosign-oidc",
  "subject": "governance_SHA256SUMS",
  "subject_sha256": "ab8b3bb2588620c...",
  "signature_file": "governance_SHA256SUMS.sig",
  "certificate_file": "governance_SHA256SUMS.cert",
  "identity": {
    "oidc_issuer": "https://token.actions.githubusercontent.com",
    "subject": "https://github.com/org/summit/.github/workflows/ga-release.yml@refs/tags/v4.1.2"
  },
  "tag": "v4.1.2",
  "git_sha": "abc123...",
  "timestamp": "2026-01-08T12:00:00Z"
}
```

---

## Verification Process

### Automatic Verification

Signature verification happens in:

- `publish_guard.sh` - Before GA publish
- `verify_release_bundle.sh` - For downloaded bundles

### Manual Verification

```bash
# Verify using cosign directly
cosign verify-blob \
  --signature governance/signatures/governance_SHA256SUMS.sig \
  --certificate governance/signatures/governance_SHA256SUMS.cert \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --certificate-identity-regexp "https://github.com/.*/summit/.github/workflows/(ga-release|rc-release).*" \
  governance/governance_SHA256SUMS
```

### Verification Script

```bash
# Verify using the signing script
./scripts/release/sign_governance_lockfile.sh \
  --mode verify \
  --subject governance/governance_SHA256SUMS \
  --out-dir governance/signatures
```

### Exit Codes

| Code | Meaning                                                         |
| ---- | --------------------------------------------------------------- |
| 0    | Verification passed                                             |
| 1    | Verification failed                                             |
| 2    | Bundle is unsigned (when in verify mode with unsigned metadata) |

---

## Bundle Integration

### GA Bundle

GA bundles include signature artifacts in `provenance.json`:

```json
{
  "governance_signature": {
    "method": "sigstore-cosign-oidc",
    "status": "ok",
    "subject": "governance/governance_SHA256SUMS",
    "sig_path": "governance/signatures/governance_SHA256SUMS.sig",
    "cert_path": "governance/signatures/governance_SHA256SUMS.cert",
    "metadata_path": "governance/signatures/metadata.json",
    "identity_policy": "security/sigstore-identity-policy.yml"
  }
}
```

### RC Bundle

RC bundles include signature artifacts in `pipeline_metadata.json` with the same structure.

### Unsigned Bundles

If signing fails or OIDC token is unavailable, bundles are marked as unsigned:

```json
{
  "governance_signature": {
    "method": "unsigned",
    "status": "no_oidc_token",
    ...
  }
}
```

---

## Enforcement

### Publish Guard

`publish_guard.sh` checks governance signature:

- **Signed bundles**: Verifies signature with identity pinning
- **Unsigned bundles**: Warns but allows (unless `--strict`)
- **Verification failure**: Fails the guard

### Verify Release Bundle

`verify_release_bundle.sh` options:

| Option                             | Behavior                                   |
| ---------------------------------- | ------------------------------------------ |
| Default (auto)                     | Verify if GA bundle and cosign available   |
| `--verify-governance-signature`    | Always verify (fail if cosign unavailable) |
| `--no-verify-governance-signature` | Skip signature verification                |
| `--strict`                         | Fail on unsigned bundles                   |

---

## Troubleshooting

### "No GitHub OIDC token available"

**Cause:** Workflow doesn't have `id-token: write` permission.

**Fix:** Add permission to workflow:

```yaml
permissions:
  id-token: write
  contents: read
```

### "Verification failed - identity constraints not met"

**Cause:** Signature was created by a workflow not in the allowed list.

**Investigation:**

1. Examine the certificate: `openssl x509 -in governance_SHA256SUMS.cert -noout -text`
2. Look for the subject alternative name (SAN) which contains the workflow identity
3. Compare against `security/sigstore-identity-policy.yml`

### "cosign not available"

**Cause:** cosign is not installed.

**Fix:** Install cosign:

```bash
# macOS
brew install cosign

# Linux
curl -sSfL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 -o /tmp/cosign
sudo install /tmp/cosign /usr/local/bin/cosign
```

### "Bundle is unsigned"

**Cause:** Signing was skipped due to missing OIDC token or other error.

**Investigation:**

1. Check `governance/signatures/metadata.json` for the `reason` field
2. Common reasons:
   - `no_oidc_token` - Workflow missing id-token permission
   - `signing_failed` - cosign command failed
   - `script_not_found` - Signing script missing

---

## Security Considerations

### Transparency Log

All Sigstore signatures are recorded in the Rekor transparency log. This provides:

- Public audit trail of all signatures
- Proof that signature existed at a specific time
- Detection of key compromise

### Key Rotation

Sigstore uses ephemeral keys:

- No long-lived signing keys to protect
- Keys are valid only for the duration of signing
- Certificate includes timestamp

### Identity Verification

The certificate chain ensures:

1. Token was issued by GitHub Actions
2. Token represents the specific workflow run
3. Workflow is in the allowed list

---

## Scripts Reference

| Script                        | Purpose                                      |
| ----------------------------- | -------------------------------------------- |
| `sign_governance_lockfile.sh` | Sign or verify governance lockfile           |
| `publish_guard.sh`            | Pre-publish verification including signature |
| `verify_release_bundle.sh`    | Bundle verification including signature      |
| `build-ga-bundle.sh`          | GA bundle with automatic signing             |
| `build-promotion-bundle.sh`   | RC bundle with automatic signing             |

## Configuration Files

| File                                    | Purpose                    |
| --------------------------------------- | -------------------------- |
| `security/sigstore-identity-policy.yml` | Allowed signing identities |

---

## Related Documentation

- **Governance Stamping:** `docs/ci/GOVERNANCE_STAMPING.md`
- **Governance Lockfile:** `docs/ci/GOVERNANCE_LOCKFILE.md`
- **Governance Compliance:** `docs/ci/GOVERNANCE_COMPLIANCE.md`
- **Release Pipeline:** `docs/ci/RELEASE_PIPELINE.md`

---

**Document Authority:** Platform Engineering
**Next Review:** 2026-02-08 (or before MVP-5 kickoff)
