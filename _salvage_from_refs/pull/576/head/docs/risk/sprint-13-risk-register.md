# Sprint 13 Risk Register

| Threat | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Telemetry/metering data exfiltration | Medium | High | Quotas, allowlists, signed clients |
| Billing export privacy leak | Medium | High | DLP masks, hashed tenant IDs |
| Plugin escape / RCE | Low | High | WASM sandbox, signed manifests |
| SSO misconfiguration | Medium | Medium | Metadata validation, tests |
| Flag mis-rollout causing outage | Medium | Medium | Progressive delivery, kill switches |

