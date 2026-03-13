# Merge Validation Gate

This directory contains the `pre-merge-check.sh` script which serves as a CI validation gate to ensure Pull Requests meet all quality requirements before they can enter the merge train.

## Checks Performed

The script validates the following conditions:

1. **Conventional Commit Title**
   - **Requirement**: The PR title must follow the conventional commit format: `type(scope): description` or `type: description`.
   - **Allowed Types**: `feat`, `fix`, `docs`, `chore`, `ci`, `test`, `refactor`.
   - **How to fix**: Edit the PR title to follow conventional format.

2. **Draft Status**
   - **Requirement**: The PR must not be in a draft state.
   - **How to fix**: Click "Ready for review" in the PR UI.

3. **Description Length**
   - **Requirement**: The PR description (body) must not be empty and must be greater than 50 characters in length.
   - **How to fix**: Add a meaningful description to the PR body.

4. **Review Approval**
   - **Requirement**: The PR must have at least one approved review.
   - **How to fix**: Request a review from a team member and wait for approval.

5. **Mergeability**
   - **Requirement**: The branch must be up-to-date with `main` and have no merge conflicts.
   - **How to fix**: Rebase your branch onto `main` or merge `main` into your branch.

6. **Status Checks**
   - **Requirement**: All required CI status checks (excluding this validation gate itself) must be green.
   - **How to fix**: Check the failed CI jobs and fix the issues in your code.

## Output Format

The script outputs a structured JSON object containing the pass/fail status and a descriptive message for each check, as well as an `overall_status` of either `READY` or `BLOCKED`.

## Adding new checks

1. Add a new check key to the initial `RESULTS` JSON in `pre-merge-check.sh`.
2. Implement the check logic and call `update_result "<check_name>" "PASS|FAIL" "<message>"`.
3. Add the check name to the `for` loop evaluating the overall status.
4. Document the check in this README.
