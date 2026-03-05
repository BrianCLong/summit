# Required Checks Configuration

These checks need to be configured as required status checks in the GitHub repository branch protection rules for `main`:

* `summit-infra-verify`
* `summit-policy-verify`
* `summit-scaffolder-verify`

Steps:
1. Go to repository Settings -> Branches.
2. Edit the branch protection rule for `main`.
3. Under "Require status checks to pass before merging", search for and add the above checks.
4. Save changes.
