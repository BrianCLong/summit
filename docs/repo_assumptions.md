# repo_assumptions.md

## Verified
- Public repo: BrianCLong/summit
- Present root dirs: agents, bench, benchmark, benchmarks, analysis, alerting, artifacts, RUNBOOKS, SECURITY, .github, .ci, .opa/policy
- Present workflows: CI, agentic-evals, agentic-evals-robust, agentplace-drift, agentplace-policy, evidence-bundle-validation

## Assumed
- benchmarks/ is acceptable for new benchmark suites
- docs/runbooks/ is acceptable for operational docs
- artifacts/<feature>/ is acceptable for deterministic output bundles
- alerting/ or scripts/monitoring/ is acceptable for drift jobs

## Must-not-touch
- Existing core GraphQL/API entrypoints without clear need
- Existing CI policy files until required-check names are verified
- Existing evidence-bundle schemas unless backward-compatible
- Security policy files under .opa/policy and SECURITY without owner review
