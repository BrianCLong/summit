# Required Checks Discovery (TODO)

This file tracks the mapping between official GitHub branch protection rules and temporary CI gate names.

## Discovery Steps

1.  **GitHub UI**: Go to `Settings` -> `Branches` -> `Branch protection rules` -> `main`. Note the "Status checks that are required".
2.  **API**: Run `gh api repos/:owner/:repo/branches/main/protection/required_status_checks` to list contexts.

## Temporary Gate Names

Until we confirm the exact required checks, we use the following mapping:

| Gate Intent | Temporary CI Job | Status |
| :--- | :--- | :--- |
| Evidence Validation | `ci/evidence-validate` | **Active** (PR1) |
| Tool Schema Check | `ci/toolcall-schema-test` | Planned (PR2) |
| Vendor Verify | `ci/vendor-preverify` | Planned (PR3) |
| Swarm Smoke | `ci/swarm-smoke` | Flagged (PR4) |

## Plan

Once the exact check names are known (e.g., `test (3.11)` vs `ci/test`), rename the workflows or update this file to reflect the mapping.
