# Required Checks Discovery

This file tracks the discovery of branch protection rules and temporary CI gate names.

## Discovery Steps

1.  Navigate to GitHub UI -> Settings -> Branches -> Branch Protection.
2.  Note the "Required Status Checks".
3.  Check existing workflows in `.github/workflows/` to match names.

## Known Checks (Temporary)

*   `ci/evidence-gates`: Placeholder for the new evidence verification job.
*   `check_provenance_complete`: Proposed check for PR-04.
*   `check_key_claim_corroboration`: Proposed check for PR-04.

## Plan

1.  Implement checks in `packages/checks/`.
2.  Wire them into a GitHub Action workflow.
3.  Update this file with the actual workflow job names.
4.  If branch protection requires specific names, alias them in the workflow.
