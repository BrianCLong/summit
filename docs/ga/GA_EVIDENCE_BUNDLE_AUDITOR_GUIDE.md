# GA Evidence Bundle — Auditor Verification Guide

**Purpose**
This guide enables an independent auditor to verify the integrity and completeness of a Summit GA Evidence Bundle **without relying on CI systems, source repositories, or build pipelines**. Verification is performed solely from the extracted bundle contents.

**What this verifies**
1. Cryptographic integrity of all artifacts (SHA-256).
2. Authenticity of the integrity record via Sigstore (Cosign).
3. Completeness and internal consistency of the bundle (manifest reconciliation).

---

## Contents of a GA Evidence Bundle

An extracted bundle directory contains, at minimum:

- `bundle.sha256`
  Canonical list of SHA-256 hashes for **every file** in the bundle directory.
- `bundle.sha256.sigstore.json`
  Sigstore bundle (certificate + transparency proof) attesting to `bundle.sha256`.
- `manifest.json`
  Human-readable enumeration of artifacts, sizes, and SHA-256 digests.
- Additional evidence artifacts (e.g., SBOM, provenance, policy decisions).

---

## Prerequisites (Auditor Workstation)

- **Cosign** v2.x
  https://docs.sigstore.dev/cosign/installation/
- **sha256sum** (Linux/macOS) or equivalent SHA-256 utility
- Offline verification is supported **after** Sigstore bundle verification completes.

No repository access, CI logs, or build tools are required.

---

## Step 1 — Verify the Integrity Record (Cosign)

This step proves that `bundle.sha256` was signed using Sigstore keyless signing
and logged to the transparency log.

From inside the extracted bundle directory:

```bash
cosign verify-blob \
  bundle.sha256 \
  --bundle bundle.sha256.sigstore.json
```

### Expected Result

* Command exits with status `0`.
* Output indicates **verified**.
* No key material is required.

### What This Proves

* `bundle.sha256` has not been modified.
* The signature is cryptographically valid.
* The signing event is recorded in Sigstore’s transparency log.

> Note: Certificate identity and OIDC issuer are embedded in the bundle.
> Verification does **not** depend on GitHub, CI, or repository access.

---

## Step 2 — Verify File Hashes Against `bundle.sha256`

This step ensures that **every file in the directory** matches the integrity record.

```bash
sha256sum --check bundle.sha256
```

### Expected Result

* Every file reports `OK`.
* No missing files.
* No additional files are present that are not listed.

### What This Proves

* No file has been altered, added, or removed since the bundle was sealed.
* The directory contents exactly match the signed integrity record.

---

## Step 3 — Reconcile `manifest.json` Against the Bundle

The manifest is a structured, human-readable index of the bundle contents.

### Inspect the Manifest

```bash
cat manifest.json
```

Key fields:

* `repository` (informational)
* `sha` (informational)
* `artifacts[]`

  * `path`
  * `sha256`
  * `bytes`

### Cross-Check Procedure

For each entry in `artifacts[]`:

1. Confirm the file exists at the listed `path`.
2. Compute its SHA-256 manually:

```bash
sha256sum <path>
```

3. Confirm the digest matches:

   * `manifest.json → artifacts[].sha256`
   * `bundle.sha256 → corresponding line`

### What This Proves

* The manifest is consistent with the cryptographic record.
* File sizes and paths align with the verified hashes.
* The manifest is descriptive metadata, while `bundle.sha256` is the authoritative integrity source.

---

## Step 4 — Confirm Completeness (No Hidden Artifacts)

To ensure no undocumented artifacts exist:

```bash
find . -type f | sort
```

Compare the output to:

* Paths listed in `bundle.sha256`
* Paths listed in `manifest.json`

### Acceptance Criteria

* Every file appears in both:

  * `bundle.sha256`
  * `manifest.json`
* No extraneous files exist.

---

## Trust Model Summary

| Component                     | Trust Basis                               |
| ----------------------------- | ----------------------------------------- |
| `bundle.sha256`               | Cryptographic hash list                   |
| `bundle.sha256.sigstore.json` | Sigstore transparency + certificate       |
| `manifest.json`               | Human-readable index (non-authoritative)  |
| Evidence files                | Verified transitively via `bundle.sha256` |

**Authoritative Source of Truth:**
`bundle.sha256`, validated by Cosign.

---

## Failure Modes & Interpretation

| Failure                   | Interpretation                     |
| ------------------------- | ---------------------------------- |
| Cosign verification fails | Bundle integrity cannot be trusted |
| sha256 mismatch           | One or more files were altered     |
| Missing file              | Bundle is incomplete               |
| Extra file                | Bundle was modified post-signing   |
| Manifest mismatch         | Documentation error or tampering   |

Any failure invalidates the GA Evidence Bundle.

---

## Auditor Attestation (Optional)

Auditors may record:

* Cosign verification timestamp
* sha256sum verification output
* Hash of `bundle.sha256`
* Tool versions used

This creates an independent verification trail.

---

## Appendix — Tool Versions (Example)

```bash
cosign version
sha256sum --version
```

Record outputs in audit notes.

---

**End of Guide**
