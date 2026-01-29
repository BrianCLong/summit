# Required checks discovery (TODO)
1) Open GitHub repo → Settings → Branches → Branch protection rules.
2) List required status checks and their exact names.
3) Replace temporary check names in `.github/workflows/jetrl-ci.yml`.

## Temporary Gate Names (to be replaced or implemented)
* `ci/evidence_schema_check`
* `ci/latency_budget_gate`
* `ci/pipeline_resilience_gate`
* `ci/dependency_delta_gate`
