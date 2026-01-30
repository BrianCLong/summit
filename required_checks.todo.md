## Required checks discovery (RDP)

1. Open the repository settings → Branch protection rules.
2. Record the exact required check names (case-sensitive).
3. Use the GitHub API branch protection endpoint to confirm the same list.
4. Add them to `.github/required_checks.yml` (to be created in PR7).
5. Rename temporary gates accordingly.

Temporary checks expected:

- ci/unit
- ci/lint
- ci/evidence
- ci/deps-delta
- ci/policy
