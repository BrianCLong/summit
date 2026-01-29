# Required Checks (TODO)

This file lists the required CI checks for the Over-Engineered Retrieval System.

## Temporary Required Checks

*   `ci/lint`
*   `ci/unit`
*   `ci/typecheck`
*   `ci/security`
*   `ci/evidence-schema-validate`
*   `ci/dependency-delta`

## Discovery Plan

1.  Check GitHub Settings -> Branches -> Protection rules -> Required status checks.
2.  Use GitHub API to list checks for default branch.
3.  Update this file with authoritative names.
4.  Create a follow-up PR to rename temporary gates.
