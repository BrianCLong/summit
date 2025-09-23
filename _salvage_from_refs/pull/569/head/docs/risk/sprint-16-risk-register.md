# Sprint 16 Risk Register

| Threat | Likelihood | Impact | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| NL prompts leak sensitive data | Medium | High | Foster | Client-side redaction and opt-out logging |
| Free-form query abuse | Medium | High | Starkey | Read-only sandbox, budget guard, kill switch |
| Temporal queries overload DB | Medium | Medium | Magruder | Indexes, windowed scans, latency SLOs |
| Misleading Copilot outputs | Medium | Medium | Elara | Explain step and manual review |
| Report exports leak PII | Low | High | Foster | PII-off default, DSAR purge script |
