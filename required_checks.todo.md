# Required Checks Discovery (TODO)

1. Open the repository settings → Branch protection rules.
2. Record the exact required check names (case-sensitive).
3. Add them to `.github/required_checks.yml` (to be created in PR7).
4. Rename temporary gates accordingly.

Temporary convention (until discovered):

- ci/unit
- ci/lint
- ci/evidence
- ci/deps-delta
