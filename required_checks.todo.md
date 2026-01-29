# Required Checks Discovery

## Goal
Enumerate the current required checks for this repository to ensure our new gates are properly integrated and blocking when necessary.

## Steps to Enumerate Checks
1.  Navigate to the GitHub repository "Settings" tab.
2.  Select "Branches" from the sidebar.
3.  Click "Edit" next to the branch protection rule for `main` (or default branch).
4.  Scroll down to "Require status checks to pass before merging".
5.  List the exact names of the checks currently required.
6.  Update `ci/gates/` scripts to match these names or propose a rename plan.

## Rename Plan
Once the required checks are known, we will rename the temporary gate jobs to match the repository's convention (e.g., `gate_evidence_validate` -> `ci/evidence`).

## Todo
- [ ] List current required checks in GitHub UI/API.
- [ ] Rename temporary gate names to match repo policy.
- [ ] Ensure `gate_evidence_validate` is enabled.
- [ ] Ensure `gate_dependency_delta` is enabled.
