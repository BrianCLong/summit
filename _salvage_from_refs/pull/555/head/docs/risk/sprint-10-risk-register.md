# Sprint 10 Risk Register

| Threat | Likelihood | Impact | Owner | Mitigation |
|--------|-----------|--------|-------|-----------|
| Cross-tenant data leak via metrics/exporters | Medium | High | Starkey | Namespace metrics and hash tenant IDs |
| Label leakage in active learning datasets | Medium | High | Foster | DLP masks and DSAR hooks |
| Policy bypass on legacy path | Low | High | Elara | Single gate service with OPA |
| Canary promotion of bad model | Low | High | Stribol | Shadow deploy with rollback |
| Backup restore gap | Low | High | Magruder | Runbook and scheduled restore tests |
