# IR Controls Added: Release Hygiene

**Date:** 2024-05-23
**Related Incident Drill:** Ghost Artifact Injection
**Status:** Implemented

## 1. The Gap

The previous release preparation script (`prepare-stabilization-rc.sh`) used `git diff-index --quiet HEAD` to verify workspace cleanliness. This command **ignores untracked files**. This allowed a scenario where a local untracked sensitive file could be present in the workspace during release packaging, potentially contaminating the release artifact or Docker build context.

## 2. The Control

**Strict Workspace Verification**

We updated `check_working_tree` in `scripts/release/prepare-stabilization-rc.sh` to explicitly check for untracked files using `git status --porcelain`.

```bash
# Check for untracked files
if [[ -n $(git status --porcelain) ]]; then
    log_error "Working tree is not clean (untracked files). Cleanup or ignore them first."
    log_info "Untracked files:"
    git status --porcelain
    exit 1
fi
```

## 3. Verification

*   **Positive Test:** Run script with clean repo -> Success.
*   **Negative Test:** Run script with `touch secrets.json` -> Failure (Blocked).
