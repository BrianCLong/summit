# Decision Kubernetes Drift Monitor

This monitor detects divergence in:
- Decision CRD schema compliance
- Admission policy performance (false-allow/deny ratios)
- Evidence resolution degradation
- Controller reconciliation latency

Output artifact: `drift-report.json`
