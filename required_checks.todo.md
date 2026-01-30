# Required Checks Discovery

To ensure the "Persona Prompting" feature is properly governed, the following CI checks must be enabled and mapped to the repository settings.

## 1. List Existing Checks
Use the GitHub CLI or API to list status checks for recent commits to identify the exact names reported by the CI runners.

```bash
# Example
gh api repos/:owner/:repo/commits/main/status-check-contexts
```

The following checks are expected to be required for `atp_latent` integration:
- `ci:unit`
- `ci:schema`
- `ci:lint`
- `ci:deps-delta`

## Rename Plan
Once the actual required check names are confirmed from branch protection settings, rename these temporary checks in the CI workflows to match.
