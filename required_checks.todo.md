# Required Checks Discovery TODO

Steps to discover and map GitHub required checks to Summit internal gates:

1. [ ] Query GitHub API for branch protection rules on `main`.
2. [ ] Identify external status check names (e.g., `github-actions/verify-evidence`).
3. [ ] Map these to Summit local gate names in `ci/gates/`.
4. [ ] Rename `ci/verify_evidence.py` if a more specific name is required by the environment.
5. [ ] Ensure `ga-verify` script includes all identified checks.
