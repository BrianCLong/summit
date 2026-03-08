# Runbook: Insider-Threat Response

## Trigger Conditions

- mass data export anomaly
- privilege escalation anomaly
- critical insider risk score threshold breach

## Immediate Actions

1. Validate detector output in `artifacts/insider-risk-report.json`.
2. Correlate actor-event timeline.
3. Apply least-privilege containment if risk is critical.
4. Capture immutable evidence chain before remediation changes.
5. Open an incident ticket with governance traceability.

## Severity Mapping

| Condition | Severity |
| --- | --- |
| tampered evidence chain | critical |
| mass data export | critical |
| trust-score collapse | high |
| influence campaign indicators | high |
