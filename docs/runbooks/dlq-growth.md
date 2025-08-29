# DLQ Growth Runbook

- Symptom: DLQ growth alert or increasing failure rate.
- Indicators: failure counters, DLQ size, error types.
- Possible causes: transient upstream errors, permanent schema mismatch, auth failures.
- Immediate actions:
  - Classify top DLQ error types.
  - Retry a sample; assess transient vs permanent.
  - Validate credentials and endpoint reachability.
- Resolution steps:
  - Implement retry with backoff/circuit breaker for transient failures.
  - Map new fields; update schema validation.
  - Quarantine bad records; create remediation ticket.
- Validation: DLQ inflow drops to zero; backlog drains.
