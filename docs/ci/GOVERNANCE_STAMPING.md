# Governance Stamping

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

Governance Stamping provides cryptographic binding between releases and the exact governance configuration in effect at release time. This ensures audit-grade traceability and prevents governance drift between release candidates and general availability releases.

### Key Concepts

| Term                     | Description                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **Governance Hash**      | SHA256 hash of the governance lockfile, providing a unique fingerprint of governance state                            |
| **Governance Lockfile**  | JSON snapshot of all policies, state files, and checksums at a point in time                                          |
| **Release Stamp**        | Governance hash embedded in release metadata (provenance.json, pipeline_metadata.json)                                |
| **Governance Signature** | Sigstore/cosign signature providing cryptographic authenticity (see [GOVERNANCE_SIGNING.md](./GOVERNANCE_SIGNING.md)) |
| **Regression Guard**     | CI workflow that blocks PRs introducing governance regression                                                         |

### Integrity vs Authenticity

| Property         | Mechanism          | Verification                               |
| ---------------- | ------------------ | ------------------------------------------ |
| **Integrity**    | SHA256 hashes      | `sha256sum -c SHA256SUMS`                  |
| **Authenticity** | Sigstore signature | `cosign verify-blob` with identity pinning |

Integrity ensures files haven't been modified. Authenticity ensures they were created by authorized CI workflows.

---

## Governance Hash

The governance hash is the SHA256 checksum of `governance_lockfile.json`. It provides:

- **Immutability proof** - Any change to governance configuration produces a different hash
- **Audit trail** - Releases can be verified against their governance configuration
- **Drift detection** - Compare hashes between RC and GA to detect changes

### Computing the Hash

```bash
# Simple method
sha256sum docs/releases/_state/governance_lockfile.json | cut -d' ' -f1

# Using the official script (preferred)
./scripts/release/compute_governance_hash.sh

# JSON output with metadata
./scripts/release/compute_governance_hash.sh --json

# Write to file
./scripts/release/compute_governance_hash.sh --output artifacts/governance_hash.json
```

### Hash Output Format

```json
{
  "version": "1.0.0",
  "governance_hash": "ab8b3bb2588620c98e3a6e1ded76ac43a8d7eee8fe5a29d14f612e72f1ec64f8",
  "source": "governance_lockfile.json",
  "source_path": "docs/releases/_state/governance_lockfile.json",
  "lockfile_sha": "0d1c9c69781abc123...",
  "lockfile_tag": "v4.1.2-rc.1",
  "git_sha": "0d1c9c69781abc123def456...",
  "computed_at": "2026-01-08T12:00:00Z"
}
```

---

## Release Integration

### GA Bundle (`build-ga-bundle.sh`)

GA bundles include governance hash in two locations:

1. **`provenance.json`** - Release provenance with governance binding:

   ```json
   {
     "version": "1.0.0",
     "type": "ga-release-provenance",
     "release": {
       "tag": "v4.1.2",
       "sha": "abc123...",
       "type": "ga"
     },
     "governance": {
       "governance_hash": "ab8b3bb2588620c...",
       "lockfile_path": "governance/governance_lockfile.json",
       "sums_path": "governance/governance_SHA256SUMS",
       "verification_command": "sha256sum governance/governance_lockfile.json"
     }
   }
   ```

2. **`ga_metadata.json`** - Bundle metadata:
   ```json
   {
     "version": "1.2.0",
     "bundle_type": "ga-release",
     "governance_hash": "ab8b3bb2588620c...",
     "governance_lockfile": {
       "path": "governance/governance_lockfile.json",
       "sha256": "ab8b3bb2588620c...",
       "sums_path": "governance/governance_SHA256SUMS"
     }
   }
   ```

### RC Promotion Bundle (`build-promotion-bundle.sh`)

RC bundles include governance hash in `pipeline_metadata.json`:

```json
{
  "version": "1.0.0",
  "type": "rc-promotion-bundle",
  "governance": {
    "governance_hash": "ab8b3bb2588620c...",
    "lockfile_path": "governance/governance_lockfile.json",
    "verification_command": "sha256sum governance/governance_lockfile.json"
  }
}
```

---

## Regression Guard

The Governance Regression Guard prevents PRs from merging if they reduce compliance.

### Trigger Conditions

The guard runs on PRs that modify:

- Policy files (`docs/ci/*.yml`, `docs/ci/*.yaml`)
- State files (`docs/releases/_state/*.json`)
- Governance scripts (`scripts/release/*governance*.sh`)
- Governance workflows (`.github/workflows/*governance*.yml`)

### Pass Criteria

PRs must maintain **COMPLIANT** status (score >= 90%) to pass.

### Workflow

```
PR opened/updated
    ↓
Checkout code
    ↓
Compute governance hash
    ↓
Run check_governance_compliance.sh --json
    ↓
├── COMPLIANT (≥90%) → ✅ Pass
└── NON_COMPLIANT (<90%) → ❌ Fail + PR comment
```

### Manual Override

If a legitimate change temporarily reduces compliance (e.g., removing an obsolete policy), the workflow can be manually approved by a maintainer after review.

---

## Verification

### Verify Release Governance

```bash
# Download and extract GA bundle
tar xzf v4.1.2-ga-bundle.tar.gz
cd v4.1.2

# Verify governance lockfile integrity
cd governance && sha256sum -c governance_SHA256SUMS && cd ..

# Verify governance hash matches provenance
EXPECTED=$(jq -r '.governance.governance_hash' provenance.json)
ACTUAL=$(sha256sum governance/governance_lockfile.json | cut -d' ' -f1)

if [[ "${EXPECTED}" == "${ACTUAL}" ]]; then
  echo "✅ Governance hash verified"
else
  echo "❌ Governance hash mismatch!"
  exit 1
fi
```

### Compare RC to GA Governance

```bash
# Ensure governance didn't drift between RC and GA
RC_HASH=$(jq -r '.governance.governance_hash' rc-bundle/pipeline_metadata.json)
GA_HASH=$(jq -r '.governance.governance_hash' ga-bundle/provenance.json)

if [[ "${RC_HASH}" == "${GA_HASH}" ]]; then
  echo "✅ Governance unchanged from RC to GA"
else
  echo "⚠️ Governance changed between RC and GA"
  echo "RC:  ${RC_HASH}"
  echo "GA:  ${GA_HASH}"
fi
```

---

## Audit Trail

All governance stamping events are logged to the governance audit log:

```bash
# View stamping events
./scripts/release/query_governance_audit_log.sh --event-type stamp

# View guard events
./scripts/release/query_governance_audit_log.sh --event-type guard

# View recent events
./scripts/release/query_governance_audit_log.sh --limit 10
```

### Event Types

| Event Type   | Description                          |
| ------------ | ------------------------------------ |
| `stamp`      | Governance hash computed for release |
| `guard`      | Regression guard evaluation          |
| `gate`       | Governance gate pass/fail            |
| `validation` | Policy validation results            |

---

## Troubleshooting

### "No governance lockfile found"

**Cause:** Lockfile doesn't exist at expected path.

**Fix:**

```bash
./scripts/release/generate_governance_lockfile.sh \
  --sha $(git rev-parse HEAD) \
  --out-dir docs/releases/_state
```

### "Governance hash mismatch"

**Cause:** Lockfile was modified after release was stamped.

**Investigation:**

1. Check if lockfile was regenerated after release
2. Verify no manual edits to lockfile
3. Compare git history of lockfile

### "Regression guard failed"

**Cause:** PR reduces compliance below COMPLIANT threshold.

**Fix:**

1. Run `./scripts/release/check_governance_compliance.sh --verbose`
2. Address each failing component
3. Re-push to trigger guard re-run

---

## Scripts Reference

| Script                            | Purpose                               |
| --------------------------------- | ------------------------------------- |
| `compute_governance_hash.sh`      | Compute governance hash from lockfile |
| `build-ga-bundle.sh`              | Generate GA bundle with provenance    |
| `build-promotion-bundle.sh`       | Generate RC bundle with metadata      |
| `check_governance_compliance.sh`  | Check overall compliance status       |
| `generate_governance_lockfile.sh` | Create governance lockfile            |
| `verify_governance_lockfile.sh`   | Verify lockfile integrity             |

## Workflows Reference

| Workflow                           | Purpose                              |
| ---------------------------------- | ------------------------------------ |
| `governance-regression-guard.yml`  | Block PRs with governance regression |
| `_reusable-governance-gate.yml`    | Reusable governance verification     |
| `governance-policy-validation.yml` | Validate policy file syntax          |
| `governance-lockfile-verify.yml`   | Verify lockfile integrity            |

---

## Release Notes Integration

### Governance Identity Block

Every RC and GA release includes a "Governance Identity" section in `github_release.md`:

```markdown
### Governance Identity

- **Governance Hash:** `ab8b3bb2588620c98e3a6e1ded76ac43...`
- **Governance Signature:** SIGNED
- **Authenticity:** VERIFIED

<details>
<summary>Verification</summary>

\`\`\`bash

# Verify governance hash

sha256sum governance/governance_lockfile.json

# Expected: ab8b3bb2588620c98e3a6e1ded76ac43...

# Verify signature (requires cosign)

cosign verify-blob \
 --signature governance/signatures/governance_SHA256SUMS.sig \
 --certificate governance/signatures/governance_SHA256SUMS.cert \
 --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
 --certificate-identity-regexp "https://github.com/.*/summit/.github/workflows/.*" \
 governance/governance_SHA256SUMS
\`\`\`

</details>
```

### Field Definitions

| Field                    | Values                            | Description                           |
| ------------------------ | --------------------------------- | ------------------------------------- |
| **Governance Hash**      | 64-char hex                       | SHA256 of governance_lockfile.json    |
| **Governance Signature** | SIGNED / UNSIGNED                 | Whether bundle has Sigstore signature |
| **Authenticity**         | VERIFIED / NOT_VERIFIED / UNKNOWN | Signature verification result         |

### Generation

The identity block is generated by `emit_governance_identity_block.sh`:

```bash
# Generate for GA bundle
./scripts/release/emit_governance_identity_block.sh \
  --bundle-dir ./artifacts/ga-bundles/v4.1.2 \
  --mode ga

# Generate for RC bundle
./scripts/release/emit_governance_identity_block.sh \
  --bundle-dir ./artifacts/promotion-bundles/v4.1.2-rc.1 \
  --mode rc

# JSON output for automation
./scripts/release/emit_governance_identity_block.sh \
  --bundle-dir ./bundle \
  --mode ga \
  --json
```

---

## Related Documentation

- **Governance Lockfile:** `docs/ci/GOVERNANCE_LOCKFILE.md`
- **Governance Compliance:** `docs/ci/GOVERNANCE_COMPLIANCE.md`
- **Governance Signing:** `docs/ci/GOVERNANCE_SIGNING.md`
- **Release Pipeline:** `docs/ci/RELEASE_PIPELINE.md`
- **Audit Trail:** `docs/ci/GOVERNANCE_AUDIT_TRAIL.md`

---

**Document Authority:** Platform Engineering
**Next Review:** 2026-02-08 (or before MVP-5 kickoff)
