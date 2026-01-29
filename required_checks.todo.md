# Required checks discovery (TODO)

1) Identify branch protection required checks (GitHub UI):
   - Repo → Settings → Branches → Branch protection rules → Required status checks

2) Map each required check name to the CI job in this repo.

3) Update CI verifier spec:
   - Replace placeholder check names:
     - agent_composer_unit
     - agent_composer_e2e
     - agent_composer_citation_verifier
     - agent_composer_policy_suite
