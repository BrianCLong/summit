# Required checks discovery (TODO)
## UI
1. GitHub repo → Settings → Branches
2. Find default branch protection rule
3. Record "Required status checks" names verbatim

## API
- Use GitHub Branch Protection API for the default branch.

## Temporary gates (until discovery)
- ci/summit-harness-evidence
- ci/summit-tool-policy

## Rename plan
- After discovery, rename gates to match required checks in a dedicated PR.
