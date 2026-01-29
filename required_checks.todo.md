# Required Checks Discovery

Since repo access is limited and we cannot see GitHub Actions logs or settings directly, we must perform discovery.

## Discovery Plan

1. **List Checks via API**:
   Use `gh api repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks` to see strict requirements.

2. **Observe CI Runs**:
   Push a PR and list the check names that appear.

3. **Temporary Gate Names**:
   Until exact names are known, we map our internal gates to:
   - `ci/summit-gate-split-brain`
   - `ci/summit-gate-policy`
   - `ci/summit-gate-objective-conflict`

## Action Items

- [ ] Execute `gh api` command (once token available).
- [ ] Rename temporary gates in `ci/verifier_spec.md` to match actual GitHub check names.
