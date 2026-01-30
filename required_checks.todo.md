# Required checks discovery

1. Open repo settings → Branch protection → record required status check names.
2. Or via API: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks.
3. Replace placeholder names in CI + docs:
   - ci/evidence_schema
   - ci/dependency_delta
   - ci/unit_tests
4. Add a PR to rename gates to the canonical check names.
