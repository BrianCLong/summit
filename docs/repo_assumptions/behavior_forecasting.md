# repo_assumptions.md

## Verified
- Public repo: BrianCLong/summit
- Present workflows: CI, agentic-evals, agentic-evals-robust, agentplace-drift, agentplace-policy, evidence-bundle-validation
- Standard `unittest` used for python components

## Assumed
- benchmarks/ is acceptable for new benchmark suites
- docs/runbooks/ is acceptable for operational docs
- artifacts/behavior-forecasting/ is acceptable for deterministic output bundles
- alerting/ or scripts/monitoring/ is acceptable for drift jobs

## Must-not-touch
- Existing core GraphQL/API entrypoints without clear need
- Existing CI policy files until required-check names are verified
- Existing evidence-bundle schemas unless backward-compatible
- Security policy files under .opa/policy and SECURITY without owner review
