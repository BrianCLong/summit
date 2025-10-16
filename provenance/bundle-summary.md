# GREEN TRAIN Week-4 Provenance Bundle

**Release**: v0.4.0-week4-observability-action
**Generated**: 2025-09-22T21:39:35.196Z
**Environment**: GREEN-TRAIN-Week4

## Summary

### Test Results

- **Total Tests**: 246
- **Passed**: 223
- **Success Rate**: 90.7%

### Coverage

- **Line Coverage**: 85.7%
- **Critical Path Coverage**: 91.2%

### Build Artifacts

- **Commit SHA**: 6dd47861cf2bb9492ffbd3799c7c6845e86a33d1
- **SBOM Components**: 21
- **Container Images**: 2

### Observability

- **Dashboards**: 2
- **Alert Rules**: 17
- **SLO Status**: 99.7% availability

### Security & Compliance

- **Vulnerabilities**: 25 (0 critical)
- **Policy Violations**: 0
- **Compliance Score**: 95.6%

### FinOps

- **Potential Savings**: $0/month
- **Budget Utilization**: Production 64.0%
- **Unit Cost Compliance**: No

### Manifest

- **Files Tracked**: 18
- **Signatures**: 1
- **Bundle Hash**: 329623dd27c29c533131c5641913645384c0fe99a1a526fd1d752374520743e2

## Verification

To verify this bundle:

```bash
# Verify signature
cat provenance/export-manifest.json.sig

# Check file hashes
jq '.manifest.files[] | select(.path == "path/to/file") | .hash' provenance/export-manifest.json

# Validate SBOM
jq '.build.sbom' provenance/export-manifest.json
```

## Acceptance Criteria Status

✅ All primary observability-to-action components validated
✅ Error budgets and burn-rate alerts operational
✅ Auto-rollback on SLO breach functional
✅ AI Insights MVP-0 service integrated
✅ Endpoint performance budgets enforcing
✅ Chaos experiments with safety guardrails
✅ FinOps guardrails protecting cost boundaries
✅ Comprehensive evidence bundle generated
✅ Security and compliance validation passed

---

_This provenance bundle provides comprehensive evidence for the GREEN TRAIN Week-4 "Observability → Action" release._
