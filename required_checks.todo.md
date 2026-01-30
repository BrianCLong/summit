# Required checks discovery (Lane 1)

1. **Discover Checks**:
   - Open GitHub repo → Settings → Branches → Required status checks.
   - Use `gh api` to list checks if accessible.

2. **Temporary Local Names**:
   - `summit-evidence`: Runs `ci/check_evidence.sh`.
   - `summit-tests`: Runs unit tests.
   - `summit-lint`: Runs linters.

3. **Rename Plan**:
   - Once real check names are discovered, map them in `.github/workflows`.
