# MVP-4 Release Candidate (RC) Cut Runbook

**Status:** Active
**Role:** Release Captain
**Scope:** Cutting a `v*.*.*-rc.*` tag for stabilization

---

## 1. Preconditions & Environment

Before cutting an RC, ensure your environment is clean and dependencies are installed.

### 1.1 Check Environment
```bash
# Must be on main branch
git checkout main
git pull origin main

# Must have clean working tree
git status --porcelain
# (Should be empty)

# Must have dependencies installed (CRITICAL)
# If this fails, STOP. You cannot verify the release.
pnpm install --frozen-lockfile
```

### 1.2 Verify Dependencies
Ensure specific tools used by release scripts are present:
```bash
# Check for js-yaml (required by validate-release-policy.mjs)
npm list js-yaml || echo "WARNING: js-yaml missing, policy check may fail"
```

---

## 2. Release Policy Validation Gate

You must prove the repo is healthy *before* tagging.

### 2.1 Run Release Policy Check
This script validates governance policies and required checks.
```bash
node scripts/release/validate-release-policy.mjs
```

### 2.2 Run GA Verification Suite
This runs the standard suite: `typecheck`, `lint`, `build`, `test:unit`, `ga:smoke`.
```bash
pnpm ga:verify
```
*Note: If this fails, do not cut the RC. Fix the blocker first.*

### 2.3 Run Pre-Release Health Check
```bash
chmod +x scripts/release/pre_release_health_check.sh
./scripts/release/pre_release_health_check.sh --strict
```

---

## 3. Troubleshooting & Known Issues

During verification, you may encounter the following issues if the environment is not perfectly prepped.

### 3.1 "Cannot find package 'js-yaml'"
**Symptom:** `validate-release-policy.mjs` fails with `ERR_MODULE_NOT_FOUND`.
**Cause:** Dev dependencies are missing.
**Fix:** Run `pnpm install` (or `npm install js-yaml` temporarily if full install is too heavy).

### 3.2 "tsc: not found" or "eslint: not found"
**Symptom:** `pnpm ga:verify` fails early.
**Cause:** `typescript` and `eslint` are not in the PATH or `node_modules`.
**Fix:** Ensure `pnpm install` has completed successfully.

### 3.3 Missing Git Tags
**Symptom:** `prepare-stabilization-rc.sh` defaults to version `v4.1.2-rc.1` when you expect a higher number.
**Cause:** Local git tags are outdated.
**Fix:** `git fetch --tags`

---


## 5. Prepare the Release Candidate

We use `scripts/release/prepare-stabilization-rc.sh` to generate artifacts and the tag deterministically.

### 5.1 Dry Run (Preview)
This calculates the next version (e.g., `v4.1.2-rc.2`) and generates artifacts in `artifacts/release/<tag>/` without modifying git.
```bash
./scripts/release/prepare-stabilization-rc.sh --dry-run
```

**Verify the output:**
1. Check the detected version is correct (e.g., increments from last RC).
2. Review generated release notes in `artifacts/release/<tag>/release_notes.md`.
3. Check `artifacts/release/<tag>/evidence.json` exists.

### 5.2 Live Execution (Create Tag)
This creates the annotated git tag locally.
```bash
./scripts/release/prepare-stabilization-rc.sh --live
```

---

## 6. Push and Trigger Pipeline

Pushing the tag triggers the `release-rc.yml` workflow, which builds the official bundle.

```bash
# Replace <tag> with the one created in step 5.2
# Example: git push origin v4.1.2-rc.2
git push origin <tag>
```

### 6.1 Verify Pipeline Start
```bash
gh run list --workflow release-rc.yml
# Ensure a new run started for your tag
```

---

## 7. Post-Cut Verification

After the CI pipeline completes (approx. 20 mins):

1. **Download Promotion Bundle:**
   ```bash
   gh run download <run-id> --name promotion-bundle-<tag>
   ```

2. **Verify Bundle Integrity:**
   ```bash
   # Ensure essential files exist
   ls -l promotion-bundle-<tag>/promote_to_ga.sh
   ls -l promotion-bundle-<tag>/REQUIRED_CHECKS.txt
   ```

---

## 8. Rollback / Emergency

If the RC is bad (e.g., critical bug found immediately after tagging):

### 8.1 Delete Remote Tag (Stops Pipeline)
```bash
git push origin :refs/tags/<tag>
```

### 8.2 Delete Local Tag
```bash
git tag -d <tag>
```

### 8.3 Cleanup Artifacts
```bash
rm -rf artifacts/release/<tag>
```

---

## Appendix: Release Mechanism Summary

*   **Versioning:** Semantic Versioning (vMajor.Minor.Patch-rc.N). Managed via `package.json` and git tags.
*   **Tooling:** `scripts/release/prepare-stabilization-rc.sh` (Manual Driver) + GitHub Actions (Automation).
*   **Changelog:** Generated automatically by `changeset` / `semantic-release` logic, or manually via `prepare-stabilization-rc.sh` templates.
*   **Policy:** Enforced by `validate-release-policy.mjs` and `pre_release_health_check.sh`.
