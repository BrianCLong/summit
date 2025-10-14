# Sprint 23 Risk Register

| Threat | Likelihood | Impact | Mitigation |
| --- | ---: | ---: | --- |
| Webhook spoof/replay | Medium | High | HMAC verify, idempotency keys, egress allowlist |
| Key compromise | Low | High | BYOK/HSM with rotation and transparency entries |
| Transparency split view | Low | High | Gossip auditors validating STH proofs |
| DP SLA breach unnoticed | Medium | Medium | Online error bounds and auto refunds |
| PII leakage in billing | Medium | High | PII-off invoices and DSAR purge |
