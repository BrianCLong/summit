# GA Release Runbook

This runbook describes the process for creating, publishing, and managing General Availability (GA) releases of the Summit Platform.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Creating a GA Release](#creating-a-ga-release)
   - [Local Tagging](#local-tagging)
   - [Manual Workflow Trigger](#manual-workflow-trigger)
4. [CI/CD Release Workflow](#cicd-release-workflow)
5. [Artifacts Produced](#artifacts-produced)
6. [Verification](#verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The GA release process is fully automated using:

- **Tagging Script**: `scripts/release/ga-tag.ts` - Creates deterministic, validated GA tags
- **GitHub Workflow**: `.github/workflows/ga-release.yml` - Builds, signs, and publishes releases

All GA releases follow semantic versioning (SemVer) and include:

- ✅ SLSA Level 3 Build Provenance
- ✅ Software Bill of Materials (SBOM) in CycloneDX + SPDX formats
- ✅ Keyless code signing via Sigstore Cosign
- ✅ SHA256 cryptographic checksums
- ✅ Complete evidence bundle for compliance

---

## Prerequisites

### Local Development

- Node.js 20.x
- pnpm 9.12.0 or higher
- ts-node (for running the tagging script)
- Clean working tree (no uncommitted changes)
- On the correct branch (default: `main`)

### CI/CD

- GitHub repository with Actions enabled
- OIDC token permissions for keyless signing
- Write access to create tags and releases

---

## Creating a GA Release

### Method 1: Local Tagging (Recommended)

Use the `ga-tag.ts` script to create validated, deterministic GA tags:

#### 1. Dry Run (Test First)

```bash
# Test tag creation without making changes
npx ts-node scripts/release/ga-tag.ts --version 2.0.0 --dry-run
```

This will:

- ✓ Validate semantic versioning
- ✓ Check working tree is clean
- ✓ Verify you're on the correct branch
- ✓ Confirm tag doesn't already exist
- ✓ Show what would be created (no actual changes)

#### 2. Create the Tag

```bash
# Create the tag locally
npx ts-node scripts/release/ga-tag.ts --version 2.0.0
```

This creates an annotated tag: `ga/v2.0.0`

#### 3. Push the Tag

```bash
# Push to trigger the release workflow
git push origin ga/v2.0.0
```

Or create and push in one command:

```bash
# Create tag and push immediately
npx ts-node scripts/release/ga-tag.ts --version 2.0.0 --push
```

#### Script Options

```bash
# Show help
npx ts-node scripts/release/ga-tag.ts --help

# Common examples
npx ts-node scripts/release/ga-tag.ts --version 2.1.0 --dry-run
npx ts-node scripts/release/ga-tag.ts --version v2.1.0 --push
npx ts-node scripts/release/ga-tag.ts --version 2.1.0 --branch main
```

**Flags:**

- `-v, --version <version>` - Version to tag (e.g., 2.0.0 or v2.0.0)
- `-n, --dry-run` - Perform dry run without creating tag
- `-p, --push` - Push tag to remote after creation
- `-b, --branch <branch>` - Expected branch (default: main)
- `-h, --help` - Show help message

---

### Method 2: Manual Workflow Trigger

You can trigger a release directly from GitHub Actions:

1. Go to: `Actions` → `GA Release` → `Run workflow`
2. Fill in the inputs:
   - **version**: e.g., `2.0.0` or `v2.0.0`
   - **dry_run**: Check to create artifacts without publishing release
   - **prerelease**: Check to mark as pre-release
3. Click `Run workflow`

This is useful for:

- Testing the release process without creating a tag
- Creating a release from a specific commit
- Re-running a failed release

---

## CI/CD Release Workflow

The GA release workflow (`.github/workflows/ga-release.yml`) runs automatically when:

1. A tag matching `ga/v*` is pushed
2. The workflow is manually triggered via `workflow_dispatch`

### Workflow Steps

#### 1. **GA Gate** (Quality Checks)

- Runs unit tests (`pnpm run test:quick`)
- Runs type checking (if available)
- **Fails fast** if tests or checks fail

#### 2. **Build** (Artifact Creation)

- Installs dependencies with `pnpm install --frozen-lockfile`
- Builds server and client: `pnpm run build`
- Creates distribution tarball: `summit-<version>.tar.gz`
- Generates SHA256 checksums
- Uploads artifacts for subsequent jobs

#### 3. **SBOM** (Software Bill of Materials)

- Generates CycloneDX SBOM: `sbom-cyclonedx.json`
- Generates SPDX SBOM: `sbom-spdx.json`
- Scans entire project including dependencies

#### 4. **Sign** (Cryptographic Signing)

- Signs artifacts with Sigstore Cosign (keyless OIDC)
- Generates signatures: `*.sig`
- Generates certificates: `*.cert`
- Creates SBOM attestations: `*.att`

#### 5. **Provenance** (SLSA Level 3)

- Uses `slsa-framework/slsa-github-generator@v1.10.0`
- Generates SLSA provenance: `*.intoto.jsonl`
- Links artifacts to source repository and commit

#### 6. **Release** (GitHub Release Creation)

- Downloads all artifacts (build, SBOM, signatures, provenance)
- Creates evidence bundle: `evidence-bundle.tar.gz`
- Generates release notes: `RELEASE_NOTES.md`
- Creates GitHub Release with all artifacts attached
- Skipped if `dry_run` is true

### Monitoring the Workflow

1. **Check workflow status**:

   ```
   https://github.com/<org>/<repo>/actions/workflows/ga-release.yml
   ```

2. **View specific run**:
   - Click on the workflow run
   - Expand each job to see detailed logs
   - Check for failures or warnings

3. **Artifacts**:
   - Artifacts are available for 90 days
   - Download from the workflow run page
   - Also attached to the GitHub Release (if created)

---

## Artifacts Produced

Each GA release includes the following artifacts:

### Release Package

- `summit-<version>.tar.gz` - Complete release (server + client distributions)

### Checksums

- `SHA256SUMS` - Combined checksums for all artifacts
- `summit-<version>.tar.gz.sha256` - Individual checksum file

### SBOM (Software Bill of Materials)

- `sbom-cyclonedx.json` - CycloneDX format (industry standard)
- `sbom-spdx.json` - SPDX format (Linux Foundation standard)

### Signatures & Attestations (Cosign)

- `summit-<version>.tar.gz.sig` - Artifact signature
- `summit-<version>.tar.gz.cert` - Signing certificate
- `summit-<version>.tar.gz.att` - SBOM attestation

### SLSA Provenance

- `<artifact-name>.intoto.jsonl` - SLSA Level 3 provenance

### Evidence Bundle

- `evidence-bundle.tar.gz` - Complete compliance package containing:
  - All artifacts
  - Checksums
  - SBOMs
  - Signatures
  - Metadata (commit, timestamp, workflow info)

### Release Notes

- `RELEASE_NOTES.md` - Generated release notes with:
  - Artifact list
  - Verification instructions
  - Build information
  - Compliance checklist

---

## Verification

After a release is created, verify the artifacts:

### 1. Verify Artifact Checksum

```bash
# Download the artifact and checksum file
wget https://github.com/<org>/<repo>/releases/download/ga/v2.0.0/summit-2.0.0.tar.gz
wget https://github.com/<org>/<repo>/releases/download/ga/v2.0.0/summit-2.0.0.tar.gz.sha256

# Verify checksum
sha256sum -c summit-2.0.0.tar.gz.sha256
```

Expected output:

```
summit-2.0.0.tar.gz: OK
```

### 2. Verify Cosign Signature

```bash
# Download artifact, signature, and certificate
wget https://github.com/<org>/<repo>/releases/download/ga/v2.0.0/summit-2.0.0.tar.gz
wget https://github.com/<org>/<repo>/releases/download/ga/v2.0.0/summit-2.0.0.tar.gz.sig
wget https://github.com/<org>/<repo>/releases/download/ga/v2.0.0/summit-2.0.0.tar.gz.cert

# Verify signature
cosign verify-blob \
  --certificate summit-2.0.0.tar.gz.cert \
  --signature summit-2.0.0.tar.gz.sig \
  summit-2.0.0.tar.gz
```

Expected output:

```
Verified OK
```

### 3. Verify SLSA Provenance

```bash
# Install slsa-verifier
go install github.com/slsa-framework/slsa-verifier/v2/cli/slsa-verifier@latest

# Download provenance
wget https://github.com/<org>/<repo>/releases/download/ga/v2.0.0/<artifact>.intoto.jsonl

# Verify provenance
slsa-verifier verify-artifact \
  --provenance-path <artifact>.intoto.jsonl \
  --source-uri github.com/<org>/<repo>
```

Expected output:

```
Verified SLSA provenance
```

### 4. Inspect SBOM

```bash
# Download SBOM
wget https://github.com/<org>/<repo>/releases/download/ga/v2.0.0/sbom-cyclonedx.json

# View SBOM (formatted)
jq . sbom-cyclonedx.json | less

# Count components
jq '.components | length' sbom-cyclonedx.json

# Search for specific dependency
jq '.components[] | select(.name == "express")' sbom-cyclonedx.json
```

---

## Rollback Procedures

If a release needs to be rolled back or yanked:

### 1. Delete Tag Locally and Remotely

```bash
# Delete local tag
git tag -d ga/v2.0.0

# Delete remote tag
git push origin :refs/tags/ga/v2.0.0
```

**⚠️ Warning**: Deleting a tag doesn't delete the GitHub Release.

### 2. Mark Release as Yanked

GitHub doesn't have a native "yank" feature, but you can:

**Option A: Edit Release to Mark as Yanked**

1. Go to: `Releases` → `ga/v2.0.0`
2. Click `Edit release`
3. Update title: `[YANKED] Summit Platform v2.0.0`
4. Update description to add warning:

   ```markdown
   ## ⚠️ RELEASE YANKED

   This release has been yanked and should not be used.

   **Reason**: [Brief explanation]

   **Use instead**: v2.0.1 or latest stable release

   ---

   [Original release notes below...]
   ```

5. Check `Set as a pre-release` (this moves it down in the releases list)
6. Save changes

**Option B: Delete the Release**

1. Go to: `Releases` → `ga/v2.0.0`
2. Click `Delete release`
3. Confirm deletion

**⚠️ Warning**: This deletes the release and all attached artifacts.

### 3. Create Hotfix Release

If the issue requires a fix:

```bash
# Fix the issue in code
git commit -m "fix: critical bug in v2.0.0"

# Create new patch release
npx ts-node scripts/release/ga-tag.ts --version 2.0.1 --push
```

### 4. Notify Users

- Update CHANGELOG.md
- Post announcement in team channels
- Send email to stakeholders
- Update documentation

### 5. Rollback Checklist

- [ ] Delete or mark release as yanked
- [ ] Delete tag (local and remote)
- [ ] Create hotfix release (if needed)
- [ ] Update CHANGELOG.md
- [ ] Notify stakeholders
- [ ] Document incident in postmortem
- [ ] Update any dependent systems

---

## Troubleshooting

### Problem: "Working tree is not clean"

**Cause**: Uncommitted changes in the repository.

**Solution**:

```bash
# Check status
git status

# Commit or stash changes
git stash  # or git commit
```

---

### Problem: "Tag already exists"

**Cause**: The tag `ga/v2.0.0` already exists locally or remotely.

**Solution**:

```bash
# Check if tag exists locally
git tag -l "ga/v2.0.0"

# Check if tag exists remotely
git ls-remote --tags origin | grep ga/v2.0.0

# Delete and recreate (if intentional)
git tag -d ga/v2.0.0
git push origin :refs/tags/ga/v2.0.0
npx ts-node scripts/release/ga-tag.ts --version 2.0.0
```

---

### Problem: "Not on expected branch"

**Cause**: You're on the wrong branch (e.g., `develop` instead of `main`).

**Solution**:

```bash
# Check current branch
git branch

# Switch to main
git checkout main

# Pull latest changes
git pull origin main
```

---

### Problem: Workflow fails at "GA Gate" step

**Cause**: Tests or type checks are failing.

**Solution**:

```bash
# Run tests locally
pnpm install
pnpm run test:quick

# Fix failing tests
# Commit fixes
# Re-push tag or re-run workflow
```

---

### Problem: "Permission denied" when pushing tag

**Cause**: Insufficient permissions or branch protection rules.

**Solution**:

- Check repository permissions (need write access)
- Check if tag push is blocked by branch protection
- Contact repository admin if needed

---

### Problem: Cosign signing fails in workflow

**Cause**: OIDC token permissions not configured correctly.

**Solution**:

1. Check workflow has `id-token: write` permission
2. Verify GitHub Actions is allowed to use OIDC
3. Check Sigstore service status: https://status.sigstore.dev

---

### Problem: SLSA provenance job fails

**Cause**: Hashes output format is incorrect.

**Solution**:

- Verify `steps.hash.outputs.hashes` is base64-encoded
- Check checksums file exists: `dist/SHA256SUMS`
- Ensure build artifacts were uploaded correctly

---

### Problem: Release artifacts missing from GitHub Release

**Cause**: Download artifact step failed or file paths don't match.

**Solution**:

1. Check workflow logs for artifact download errors
2. Verify artifact names match expected patterns
3. Check artifact retention (90 days)
4. Re-run workflow if artifacts expired

---

### Problem: Dry run doesn't create release

**Cause**: This is expected behavior.

**Solution**:

- Dry run mode creates and signs artifacts but **does not** create GitHub Release
- Check workflow artifacts for built packages
- To create release, run without `dry_run: true`

---

## Quick Reference

### Common Commands

```bash
# Dry run a release
npx ts-node scripts/release/ga-tag.ts --version 2.0.0 --dry-run

# Create and push a release tag
npx ts-node scripts/release/ga-tag.ts --version 2.0.0 --push

# Delete a tag
git tag -d ga/v2.0.0
git push origin :refs/tags/ga/v2.0.0

# Verify a release artifact
sha256sum -c summit-2.0.0.tar.gz.sha256
cosign verify-blob --certificate *.cert --signature *.sig summit-2.0.0.tar.gz
```

### Useful Links

- **Actions Workflow**: `.github/workflows/ga-release.yml`
- **Tagging Script**: `scripts/release/ga-tag.ts`
- **Releases Page**: `https://github.com/<org>/<repo>/releases`
- **Workflow Runs**: `https://github.com/<org>/<repo>/actions/workflows/ga-release.yml`

---

## Support

For issues or questions:

1. Check this runbook first
2. Review workflow logs
3. Check GitHub Issues for known problems
4. Contact the release engineering team

---

_Last updated: 2026-01-04_
