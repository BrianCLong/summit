# Required Checks Discovery

This file tracks the discovery of required CI checks (branch protections).

## Discovery Steps
1.  Push a PR.
2.  Observe which checks are marked "Required" in the GitHub UI.
3.  List them here.

## Known Required Checks
*   [ ] `ci/check_evidence_index` (Proposed)
*   [ ] `ci/check_policy_classification` (Proposed)
*   [ ] `ci/check_concept_completeness` (Proposed)
*   [ ] (Existing repo checks - TBD)

## Action Plan
Once checks are discovered, rename the temporary check jobs in `.github/workflows/` to match or add them to the list of required status checks if we have admin access.
