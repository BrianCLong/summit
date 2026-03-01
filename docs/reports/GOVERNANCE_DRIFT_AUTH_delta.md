# Governance Drift Auth Delta & Risk Assessment

## Delta
**What changed:**
1. Upgraded `.github/workflows/branch-protection-drift.yml` to authenticate via a GitHub App instead of the default `GITHUB_TOKEN`.
2. Added a strict preflight check that exits early if the required secrets (`BRANCH_PROTECTION_APP_ID`, `BRANCH_PROTECTION_APP_PRIVATE_KEY`) are missing, behaving as an advisory on scheduled runs and strictly failing on triggered evaluations.
3. Expanded `scripts/release/check_branch_protection_drift.sh` to accept a `--fail-on-drift` flag. When provided, the script now strictly exits `1` if drift is detected or if API authentication fails (403/404/etc.), whereas previously it always exited `0`.
4. Authored `docs/reports/BRANCH_PROTECTION_APP_SETUP.md` as a quick-start guide for provisioning the required App.

**Why it closes the GA governance gap:**
Previously, the drift detection ran strictly in "advisory" mode and was perpetually blind to branch settings because `GITHUB_TOKEN` lacks `Administration: read` permissions. By introducing a real, permissioned GitHub App and an optional strict-fail mechanism, the drift check is now reliable enough to serve as a hard gate during release/GA workflows—ensuring "we enforce what we publish".

## Remaining Risks
1. **P0: Secrets Provisioning.** The required Action secrets (`BRANCH_PROTECTION_APP_ID` and `BRANCH_PROTECTION_APP_PRIVATE_KEY`) must be manually provisioned via the instructions in `BRANCH_PROTECTION_APP_SETUP.md`. Until they are present, strict gates will fail. Next action: Org Admin needs to create and install the App.
2. **P1: Policy Synchronization.** Once the App is authenticated, it will reveal any true drift between `docs/ci/REQUIRED_CHECKS_POLICY.yml` and the current repo settings. This may require an initial sync or policy update to align `meta-gate`, `CI Core Gate ✅`, etc., to reality.
3. **P2: PR Description/Docstrings (#18638).** As noted in the objective tracking, #18638 still requires its description template sections and docstring coverage brought up to threshold before it is cleanly mergeable.
