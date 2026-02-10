# Required checks discovery (TODO)

1) GitHub UI:
- Repo → Settings → Branches → Branch protection rules → note “Required status checks”.

2) GitHub API (if allowed):
- List branch protections and required checks.

3) Update:
- Rename temporary checks in .github/workflows/agentkit.yml (or CI config) to match repo-required names.

# Verified Checks
- CI PR (Lint, Typecheck, Unit Tests, Integration Tests)
- Release Readiness
- Compliance
- Docs Lint
- Golden Path E2E
- Validate Claims
- Check Lockfile Drift
- CI Lineage
