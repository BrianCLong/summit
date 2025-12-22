## Summary

[What/why]

## Canary Plan
- Metrics to watch: [p95 latency, error rate, saturation]
- Ramp: 5% → 20% → 50% → 100% (hold 20% for 30–60m)
- Rollback trigger(s): [SLO burn > X, error rate > Y, anomaly Z]
- Rollback steps: `helm rollback <release> <rev>` + feature flag off

## Migration Gate (if applicable)
- [ ] Schema/contract change
- Gate: apply behind flag; run forward/backward compat tests

## Observability
- [ ] New traces/metrics/logs added
- Dashboards/alerts link:

## Security/Compliance
- [ ] Secrets via sealed-secrets
- [ ] SBOM attached; SAST/SCA clean
- [ ] Supply chain checks passed (signing, provenance, SBOM)
- Exception ID/reference (if applicable):

## Verification
- [ ] Smoke checks
- [ ] Golden path e2e: ingest → resolve → runbook → report

## 🧠 Copilot Review Tasks

- [ ] `/explain-changes`
- [ ] `/generate-tests`
- [ ] `/risk-callouts`
- [ ] `/summarize-diff`

## ✅ Checklist

- [ ] Code compiles & passes CI
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] OPA policies verified
- [ ] Grafana dashboards updated if applicable
- [ ] **Hot Files**: I have avoided modifying shared hot files (root config, Makefiles) unless absolutely necessary.
- [ ] **Feature Flags**: New behavior is hidden behind a feature flag.
