# MVP-4 Release Candidate (RC) Cut Runbook

**Role:** Release Captain / Release Engineer
**Objective:** Prepare, verify, and cut a Release Candidate tag for the MVP-4 Release Train.
**Mechanic:** `release-rc.yml` (Canonical Pipeline)

> **Strict Rule:** Do not modify runtime code. Do not create untracked files. All steps must be verified.

---

## 1. Preconditions & Environment

Ensure you are operating in a clean environment with the necessary tools.

### 1.1 Check Branch State
Ensure you are on the correct release branch (e.g., `release/v24` or `main`) and the tree is clean.

```bash
# Verify branch
git branch --show-current

# Verify clean state
git status --porcelain

# Verify upstream sync
git fetch origin
git diff HEAD origin/$(git branch --show-current) --stat
```

### 1.2 Verify Tooling Availability
Ensure critical release scripts are executable.

```bash
chmod +x scripts/release/*.sh
chmod +x scripts/release/*.mjs
chmod +x scripts/release/*.ts
```

### 1.3 Environment Variables
Ensure `GITHUB_TOKEN` is available if running verification scripts locally (required for API checks).

```bash
# Check if token is set (do not print it)
if [ -z "$GITHUB_TOKEN" ]; then echo "❌ GITHUB_TOKEN missing"; else echo "✅ GITHUB_TOKEN set"; fi
```

---

## 2. Version & Changelog Readiness

### 2.1 Identify Target Version
Determine the next RC version. The pattern is `vX.Y.Z-rc.N`.
*   **Current Version:** Check `package.json` in root.
*   **Next Version:** Increment `rc.N`.

```bash
# Check root version
node -e "const fs=require('fs');const p='package.json'; if(fs.existsSync(p)) console.log('Current Root Version:', JSON.parse(fs.readFileSync(p,'utf8')).version);"

# Check previous tags
git tag --list 'v*-rc*' | sort -V | tail -n 5
```

### 2.2 Changelog Integrity
Ensure `CHANGELOG.md` exists and is writable.

```bash
ls -l CHANGELOG.md
head -n 5 CHANGELOG.md
```

If the changelog is stale, run the generator (if available locally and configured):

```bash
# Optional: Generate changelog preview
./scripts/release/generate_changelog.sh --preview || echo "Changelog generation skipped (check CI)"
```

---

## 3. Release Policy Validation (The Gate)

Before cutting the tag, run the **Promotion Guard** verification locally (or in "offline mode" if API is restricted).

### 3.1 Run Verification Script
This script checks the "Truth Table" of required checks defined in `docs/ci/REQUIRED_CHECKS_POLICY.yml`.

```bash
# Run verification for current HEAD
# Note: May fail without GITHUB_TOKEN if checking remote statuses.
./scripts/release/verify-green-for-tag.sh --commit $(git rev-parse HEAD) --verbose
```

**Troubleshooting:**
If the script fails due to missing dependencies (e.g., `js-yaml` in `validate-release-policy.mjs`), document the failure and proceed if the CI pipeline `release-rc.yml` is known to handle this environment correctly.

### 3.2 Verify Release Bundle Content
Ensure the bundle generation script runs without error.

```bash
# Dry run bundle generation
./scripts/release/build-promotion-bundle.sh --output ./dist/dry-run-bundle --dry-run
```

---

## 4. Execution: Cut the RC

**Context:** The repo uses a "Tag Triggered" release workflow (`release-rc.yml`).

### 4.1 Create and Push Tag
This action triggers the CI pipeline.

```bash
# Set your target tag
export RC_TAG="v24.0.0-rc.1"  # REPLACE WITH ACTUAL TAG

# Tag
git tag -a "$RC_TAG" -m "Release Candidate $RC_TAG"

# Verify Tag
git show "$RC_TAG"

# Push (Triggers CI)
# git push origin "$RC_TAG"
```

### 4.2 Monitor CI Pipeline
Go to GitHub Actions and monitor the **Release RC Pipeline**.
*   **Job 1:** `verify` (Release Readiness Gate)
*   **Job 2:** `promotion-guard` (Policy Checks)
*   **Job 3:** `bundle` (Artifact Assembly)

### 4.3 Verify Artifacts
Once CI completes, download `rc-pipeline-bundle-{tag}`.
It contains:
*   `pipeline_metadata.json`
*   `REQUIRED_CHECKS.txt`
*   `promote_to_ga.sh`

---

## 5. Rollback Procedure

If the RC is broken or invalid:

1.  **Delete Remote Tag:**
    ```bash
    git push --delete origin "$RC_TAG"
    ```
2.  **Delete Local Tag:**
    ```bash
    git tag -d "$RC_TAG"
    ```
3.  **Mark as Broken:**
    Update `docs/releases/MVP-4_RELEASE_NOTES.md` (or similar) to indicate `vX.Y.Z-rc.N` was yanked.

---

## 6. Known Issues / Blockers

*   **Missing Dependency:** `validate-release-policy.mjs` requires `js-yaml` which may be missing in the local environment. Use `scripts/release/verify-green-for-tag.sh` as the primary gate.
*   **Monorepo Versioning:** `package.json` versions vary across the monorepo (`1.0.0`, `2.0.0`, `0.1.0`). The Release Tag `v24` acts as a "Release Train" identifier, not necessarily syncing all package versions.

---

**Signed off by:** Release Captain Jules
