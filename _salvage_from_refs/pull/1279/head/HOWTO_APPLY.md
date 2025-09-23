IntelGraph — Sprint 25 PR Patch Set
===================================

Files:
- pr1_policy.patch — policies/export.rego + CI + docs
- pr2_grafana.patch — Grafana dashboard + provisioning
- pr3_pm.patch — Jira CSV + guide

Apply (from repo root):

  git checkout -b feature/policy-export-opa
  git apply /path/to/pr1_policy.patch
  git add -A && git commit -m "feat(policy): export policy + CI + docs"

  git checkout -b chore/grafana-ga-core-dashboard
  git apply /path/to/pr2_grafana.patch
  git add -A && git commit -m "chore(obs): Grafana GA Core dashboard + provisioning"

  git checkout -b chore/pm-sprint25-jira-csv
  git apply /path/to/pr3_pm.patch
  git add -A && git commit -m "chore(pm): add Sprint 25 Jira CSV + guide"

Notes:
- OPA CI uses a smoke test to guarantee green while policy evolves.
- Grafana JSON is your attached dashboard.
- Jira CSV is your attached file for reproducible import.
Generated: 2025-09-17T15:16:08.787612
