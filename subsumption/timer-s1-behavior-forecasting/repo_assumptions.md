# Repo Assumptions & Assertions

## Verified
- Repo is public: BrianCLong/summit
- Existing root dirs: `agents`, `bench`, `benchmark`, `benchmarks`, `analysis`, `alerting`, `artifacts`, `RUNBOOKS`, `SECURITY`, `.github`, `.ci`, `.opa/policy`
- Workflows present: `CI`, `agentic-evals`, `agentic-evals-robust`, `agentplace-drift`, `agentplace-policy`, `evidence-bundle-validation`

## Assumed
- `benchmarks/` is acceptable for new benchmark suites.
- `docs/runbooks/` is acceptable for operational docs (despite `RUNBOOKS/` root).
- `artifacts/behavior-forecasting/` is acceptable for deterministic output bundles.
- `alerting/` or `scripts/monitoring/` is acceptable for drift jobs.

## Must-not-touch
- Existing core GraphQL/API entrypoints without clear need.
- Existing CI policy files until required-check names are verified.
- Existing evidence-bundle schemas unless backward-compatible.
- Security policy files under `.opa/policy` and `SECURITY` without owner review.
