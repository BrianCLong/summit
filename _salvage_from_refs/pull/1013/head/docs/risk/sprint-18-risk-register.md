# Sprint 18 Risk Register

| Threat | Likelihood | Impact | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Federation data exfil | Medium | High | Starkey | Signed manifests, OPA residency & capability gates, persisted queries only |
| Subscriptions DoS/backpressure | Medium | High | Elara | Redis/NATS fan-out, caps, circuit breaker, autoscale, alerts |
| Cache incoherency | Medium | Medium | Stribol | Event-sourced invalidation; write-thru; e2e coherency tests |
| PII leakage in clean rooms | Low | High | Foster | DLP-by-default, PII-off exports, DSAR propagation |
| Cost blow-up from fan-out | Medium | Medium | Magruder | Budget caps, cost/1k ops tracking, autoscale guardrails |
