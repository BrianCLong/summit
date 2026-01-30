# Required Checks Discovery (Dynamic Intent)

This checklist governs the Dynamic Intent scaffolding and associated evidence gates.

## 1. List Existing Checks

Use the GitHub UI and API to list required checks for the default branch:

1. **GitHub UI** → Repository → Settings → Branches → Branch protection rules → Required status checks.
2. **GitHub API**:

```bash
gh api repos/:owner/:repo/commits/main/status-check-contexts
```

## Temporary Required Check Names

- `ci/schema-validate`
- `ci/determinism`
- `ci/deny-by-default`
- `ci/deps-delta`
- `ci/locality-gate`

## Rename Plan

Once branch protection check names are confirmed, rename the temporary checks to match and update
`docs/dynamic_intent/summit_module_map.md` with the canonical mapping.
