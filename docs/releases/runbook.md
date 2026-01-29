# Release Runbook

This is the canonical runbook for operators to perform releases.

> **Quick Links:** See the [Release Bundle Artifacts Index](index.md) for a list of all scripts, workflows, and schemas.

## 1. Overview

- **Artifacts produced:**
  - `dist/release/*` (server and client images/bundles)
  - `release-bundle/compliance-bundle-v*.tgz`
  - `evidence-bundle.tar.gz`
  - `sbom.json`
- **RC vs GA behavior:**
  - RC releases (e.g., `v1.0.0-rc.1`) are marked as "prerelease" in GitHub Releases.
  - GA releases (e.g., `v1.0.0`) are marked as "latest" (unless configured otherwise).

## 2. Before You Tag

1.  **Run release verification scripts:**

    ```bash
    pnpm test:release-scripts
    ```

    _(If the script is present)_

2.  **Run a dry-run (Recommended):**
    Use the `workflow_dispatch` trigger to verify the build and artifact generation without publishing.

3.  **Ensure versions match:**
    Check `package.json` in root, server, and client directories to ensure they match the intended tag.

## 3. Dry-run (Recommended)

To verify the release process without creating a permanent tag or publishing:

1.  Go to **Actions** tab in GitHub.
2.  Select the **Release Train** (or `Release`) workflow.
3.  Click **Run workflow**.
4.  **Inputs:**
    - `tag`: Enter the intended tag (e.g., `v0.3.0`).
    - `dry_run`: Set to `true`.
    - `override_freeze`: Set to `true` (and provide reason if prompted) if releasing during a freeze window.
5.  **Artifacts:**
    Check the workflow run summary for the "bundle artifact" or "release-bundle" to verify outputs.

## 4. Cut an RC (Release Candidate)

**Tag format:** `vX.Y.Z-rc.N` (e.g., `v0.3.0-rc.1`)

**Command:**

```bash
git tag v0.3.0-rc.1 && git push origin v0.3.0-rc.1
```

**Expected Result:**

- CI pipeline runs.
- GitHub Release created with "Pre-release" checkbox checked.
- Artifacts attached to the release.

## 5. Cut a GA (General Availability)

**Tag format:** `vX.Y.Z` (e.g., `v0.3.0`)

**Command:**

```bash
git tag v0.3.0 && git push origin v0.3.0
```

**Expected Result:**

- CI pipeline runs.
- GitHub Release created as "Latest".
- Artifacts attached to the release.

## 6. Reviewing and Approving Release Evidence

After a release workflow completes, it may generate evidence files in the `/release-evidence/` directory. These files require a formal review and approval via a Pull Request before a release can be finalized.

- **Pull Request Template:** When creating a PR for a new evidence file, you **must** use the `release-evidence` template. This can be selected by adding `?template=release-evidence.md` to the PR creation URL. The template includes a critical checklist for the reviewer.
- **Approval:** Changes to release evidence are governed by `.github/CODEOWNERS`. An explicit approval from the designated owner (`@BrianCLong`) is required to merge.

This governance gate ensures that every release is explicitly verified against key criteria (e.g., matching tag/SHA, non-expired) before it is published.

## 7. Gates & What They Mean

- **Preflight:** Checks branch ancestry and ensures `package.json` version matches the git tag.
- **Freeze:** Checks if the current time falls within a "deployment freeze" window. Requires `override_freeze=true` to bypass.
- **Verify:** Validates checksums (`SHA256SUMS`) and ensures all required files exist in the bundle.
- **Security:**
  - **Canonical Repo Guard:** Ensures release is not running from a fork.
  - **SHA Pinned Actions:** Verifies that GitHub Actions uses immutable SHAs.
- **Idempotency:** Ensures the release process handles "create" (new release) vs "update" (existing release) correctly.

## 7. Troubleshooting

| Error Message                            | Fix                                                                                                          |
| :--------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **"Tag commit not reachable from main"** | Ensure your local branch is up-to-date with `main` and the tag is created on a commit that exists in `main`. |
| **"Version mismatch"**                   | Edit `package.json` (and sub-packages) to match the git tag exactly.                                         |
| **"Frozen window matched"**              | Wait for the freeze window to close, or re-run with `override_freeze=true` if authorized.                    |
| **"SHA256 mismatch"**                    | Regenerate artifacts locally to verify. Ensure no build processes are mutating files after generation.       |
| **"Release already exists"**             | This is expected if re-running a job. The workflow updates the existing release.                             |

## 8. FAQ

- **Why RC doesn’t become latest?**
  - RCs are for testing. Only stable `vX.Y.Z` tags update the "latest" pointer in package managers and GitHub.
- **Where is `SHA256SUMS` used?**
  - It is used by downstream consumers and the `Verify` gate to ensure artifact integrity.
- **How to download artifacts?**
  - Go to the **Releases** page in GitHub and expand the "Assets" section for the specific version.

## 9. Machine-readable outputs

Maestro Conductor and other tools can parse these files from the release artifacts:

- `dist/release/release-summary.json`: High-level success/failure status and metadata.
- `provenance.json`: SLSA provenance data.
- `freeze.json`: Status of the freeze window check.
- `preflight.json`: Results of version and ancestry checks.

Parse these JSON files for automated "go/no-go" decisions.

## 10. Verify GA Evidence Pack Attestations

The GA Evidence Pack includes cryptographically signed attestations using GitHub OIDC (keyless signing via Sigstore/cosign). These attestations provide verifiable proof that the evidence bundle was generated by authorized workflows.

### Quick Verification

```bash
# 1. Download the complete evidence artifact from GitHub Actions
# (Look for "ga-evidence-complete-<run-id>" in workflow artifacts)

# 2. Extract and navigate to the directory
cd ga-evidence-complete-<run-id>/

# 3. Verify all checksums
sha256sum -c evidence.sha256

# 4. Verify all attestations
../scripts/release/verify_ga_evidence_attestations.sh \
  --evidence-dir . \
  --expected-repo BrianCLong/summit \
  --verbose
```

### Manual Attestation Verification

If you need to verify specific attestations manually using cosign:

```bash
cd ga-evidence-complete-<run-id>/attestations/

# Verify provenance attestation
cosign verify-blob-attestation \
  --certificate-identity-regexp "https://github.com/BrianCLong/summit/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type slsaprovenance \
  --bundle provenance.intoto.jsonl \
  ../evidence.sha256

# Verify SBOM attestation (CycloneDX)
cosign verify-blob-attestation \
  --certificate-identity-regexp "https://github.com/BrianCLong/summit/.github/workflows/.*" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --type cyclonedx \
  --bundle sbom-cdx.intoto.jsonl \
  ../sbom.cdx.json
```

### What Attestations Guarantee

✅ **Guaranteed:**
- Attestations were signed with GitHub OIDC (keyless)
- Signatures are bound to specific artifact digests
- Signing workflow identity is verified
- All signatures are logged in Rekor (public transparency log)

❌ **NOT Guaranteed:**
- Correctness of the workflow itself (requires code review)
- Completeness of evidence collection (requires policy enforcement)
- Protection against compromised repository or workflow

### Trust Anchor

All attestations are verified against:
- **OIDC Issuer**: `https://token.actions.githubusercontent.com`
- **Repository**: `BrianCLong/summit`
- **Workflow**: `.github/workflows/ga-evidence-attest.yml`

See [GA_EVIDENCE_PACK.md](GA_EVIDENCE_PACK.md) for complete attestation documentation.

## 11. Debugging Bundles

To compare two release bundles (e.g., to investigate regressions or verify changes):

```bash
pnpm release:diff -- --a ./dist/release-v1 --b ./dist/release-v2
```

This will output:

- Added/removed files
- Files with changed checksums
- Meaningful JSON differences (ignoring timestamps)
- Schema version warnings
