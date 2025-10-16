# Release Notes Template

- Version: `{{ .tag }}`
- Date: `{{ now | date "2006-01-02" }}`
- Commit SHA: `{{ .commit }}`
- Environments: dev → stage → prod
- SBOM: `{{ .sbom_uri }}`
- Provenance: `{{ .provenance_uri }}`
- Cosign Signature: `{{ .signature_uri }}`

## Summary

- Feature highlights
- Dependency upgrades
- Infrastructure changes

## Compliance

- Vulnerability scan summary (High/Critical = 0)
- License scan result (Approved/Rejected)
- OPA policy decision link

## Rollout Plan

- Canary duration: 30 minutes or 2 traffic slices
- Promotion criteria: <1% error rate, latency within SLO, policy gate approved

## Post-Release Validation

- Synthetic checks link
- Observability dashboards
- PagerDuty service(s)
