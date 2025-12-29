# Release Process Guide

This document outlines the standard procedure for cutting a new point release (vX.Y.Z) for the IntelGraph Platform. Following this guide ensures that every release is consistent, verifiable, and well-documented.

## Prerequisites

- You must be designated as the **Release Captain**.
- You must have push access to the `main` branch.
- You must have `pnpm` and `jq` installed and configured correctly.

## How to Cut a New Release (vX.Y.Z)

### Step 1: Create a Release Branch

All release activities should be performed on a dedicated release branch.

```bash
git checkout main
git pull origin main
git checkout -b release/vX.Y.Z
```

### Step 2: Update the CHANGELOG

Open `CHANGELOG.md` and update the `[Unreleased]` section:

1.  Change the `[Unreleased]` heading to the new version number and date (e.g., `[v3.0.1] - 2025-01-15`).
2.  Ensure all changes for the new release are accurately documented under the "Added", "Changed", "Fixed", or "Security" subheadings.
3.  Add a new, empty `[Unreleased]` section at the top of the file.
4.  Update the release links at the bottom of the file.

### Step 3: Update Package Versions

Update the version number in the root `package.json` and all workspace `package.json` files to the new version `vX.Y.Z`. This can be done manually or with a script, but ensure all packages are updated to the same version.

### Step 4: Run the Release Verification Script

Execute the `verify-release.sh` script from the repository root. This script will perform a series of automated checks to ensure the release is in a healthy state.

```bash
./scripts/verify-release.sh
```

This script will:
- Check for version consistency across all workspace packages.
- Verify that all required release artifacts are present.
- Run a build and a quick test suite to catch any regressions.

**Do not proceed if this script fails.** Address any reported issues before continuing.

### Step 5: Commit and Open a Pull Request

Commit the changes, open a pull request targeting the `main` branch, and get it reviewed and approved.

```bash
git add CHANGELOG.md package.json packages/*/package.json client/package.json server/package.json
git commit -m "chore(release): prepare for vX.Y.Z"
git push origin release/vX.Y.Z
```

### Step 6: Merge, Tag, and Publish

Once the pull request is approved and merged into `main`, perform the final release steps:

```bash
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

The `semantic-release` or `changeset` automation will handle the final publication of the packages.

---

## Release Checklist

- [ ] Release branch created (`release/vX.Y.Z`).
- [ ] `CHANGELOG.md` updated with the new version and release date.
- [ ] All workspace package versions bumped to `vX.Y.Z`.
- [ ] `./scripts/verify-release.sh` passes successfully.
- [ ] Pull request for the release has been reviewed and approved.
- [ ] PR merged into `main`.
- [ ] Git tag `vX.Y.Z` created and pushed.
- [ ] Release published to the package registry.
