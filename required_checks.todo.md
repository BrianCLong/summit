## Required checks discovery (RDP)

1. In GitHub repo: Settings → Branches → Branch protection rules
2. Record exact check names required for merge
3. Replace placeholders in `.github/workflows/ci.yml`

Temporary checks expected:

3) Update CI verifier spec:
   - Replace placeholder check names:
     - agent_composer_unit
     - agent_composer_e2e
     - agent_composer_citation_verifier
     - agent_composer_policy_suite
     - ci/summit-evidence
     - ci/summit-policy
     - ci/summit-schema
