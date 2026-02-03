# Required checks discovery (TODO)

1) GitHub UI: Repo Settings → Branches → Branch protection rules → Required status checks.
2) GitHub API: GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks
3) Map required checks to CI job names:
   - verify (from evidence.yml)
   - ci/evidence-verify (temporary)
   - ci/unit-tests (temporary)
   - ci/dependency-delta (temporary)
   - gate/evidence (legacy temporary)
   - gate/supplychain (legacy temporary)
   - gate/fimi (legacy temporary)

Rename plan: once actual names are known, update workflows and this doc in a tiny PR.
