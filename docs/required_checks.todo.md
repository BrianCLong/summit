# Required Checks Discovery (TODO)

1) GitHub UI: Settings → Branches → Branch protection rules → note required status checks.
2) GitHub API:
   - GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
3) Record check names in `ci/required_checks.json` (to be added in PR1.5 if needed).

Temporary gate names (inferred from .github/workflows/ci-pr.yml):
- Lint
- Typecheck
- Unit Tests
- Build
- Config Guard
- Integration Tests
- Deterministic Build
- Golden Path Smoke Test
- E2E Tests (Playwright)
- Governance
- SOC Controls

Rename plan:
- Add mapping file + deprecate old names for 2 releases.
