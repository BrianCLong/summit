# Required Checks Discovery (TODO)
1) GitHub UI: Settings → Branches → Branch protection → Required status checks.
2) Record exact check names here (copy/paste).
3) Map them to Summit CI gate names and rename temporary checks.

To ensure the "Persona Prompting" feature is properly governed, the following CI checks must be enabled and mapped to the repository settings.

## 1. List Existing Checks

Use the GitHub CLI or API to list status checks for recent commits to identify the exact names reported by the CI runners.

```bash
# Example
gh api repos/:owner/:repo/commits/main/status-check-contexts
```

Temporary check names to align with this initiative (replace once branch protection names are confirmed):

- `ci/persona-evals`
- `ci/evidence-validate`

## Rename Plan

Once the actual required check names are confirmed from branch protection settings, rename these temporary checks in the CI workflows to match.
