# GA Release Runbook

## Overview
This runbook describes the process for cutting a General Availability (GA) release for the IntelGraph platform.

## Pre-requisites
- Clean git state (no uncommitted changes).
- Permission to push tags to the repository.
- `gh` CLI tool (optional, for checking release status).

## Tag Safety Guidelines
**Recommendation:** Always use annotated tags for releases.

*   **Annotated Tag (Preferred):**
    ```bash
    git tag -a v1.0.0 -m "Release v1.0.0"
    ```
    *Why?* Stores a full object with tagger name, email, and date.

*   **Signed Tag (Optional but Recommended):**
    ```bash
    git tag -s v1.0.0 -m "Release v1.0.0"
    ```
    *Why?* Provides cryptographic proof of the tagger's identity.

*   **Lightweight Tag (Avoid for Releases):**
    ```bash
    git tag v1.0.0
    ```
    *Why?* Just a pointer to a commit, lacks metadata.

The release pipeline now runs a **Tag Safety Check** which reports on these properties.

## Process

### 1. Cut GA Tag
Run the provided script to create a canonical GA tag based on the version in `pyproject.toml`.

```bash
./bin/ga-tag
```

This will create a tag in the format `ga/vX.Y.Z`.

### 2. Push Tag
Push the tag to upstream to trigger the release workflow.

```bash
git push origin ga/vX.Y.Z
```

### 3. Verify Release
The GitHub Actions workflow `ga-release.yml` will automatically:
1. Build python artifacts (wheels).
2. Generate SBOM (Syft).
3. Sign artifacts using Cosign (keyless OIDC).
4. Create a GitHub Release with all evidence attached.

Check the Actions tab in GitHub to monitor progress.

## Verification

### Local Verification of Artifacts
Download the artifacts, signature (`.sig`), and certificate (`.cert`) from the release.

Verify using `cosign`:

```bash
cosign verify-blob \
  --certificate artifact.whl.cert \
  --signature artifact.whl.sig \
  artifact.whl
```

### SBOM Inspection
The SBOM is provided as `sbom.json` in the release assets and inside the evidence bundle.

You can inspect it using `jq` or any CycloneDX tool:

```bash
jq . dist/sbom.json
```

## Rollback Guidance

### If the tag was created in error:
1. Delete the tag locally:
   ```bash
   git tag -d ga/vX.Y.Z
   ```
2. Delete the tag upstream (if pushed):
   ```bash
   git push origin :refs/tags/ga/vX.Y.Z
   ```
3. Manually delete the GitHub Release if it was created.

### If a bad release was published:
1. Do **not** reuse the version number.
2. Increment the version in `pyproject.toml`.
3. Follow the release process for the new version.
4. Mark the bad release as "Pre-release" or update the release notes to warn users.
