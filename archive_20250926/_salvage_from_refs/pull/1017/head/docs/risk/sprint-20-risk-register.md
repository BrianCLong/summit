# Sprint 20 Risk Register

| Threat | Likelihood | Impact | Owner | Mitigation |
| --- | ---: | ---: | --- | --- |
| PSI token reuse/correlation | Medium | High | Starkey | Ephemeral keys, nonces, TTL, audit issuance |
| Post-join linkage attacks | Medium | High | Foster | k>=25, clipping, DP accounting, aggregates only |
| Kafka cost spikes | Medium | Medium | Magruder | Tenant topics, quotas, autoscale |
| Model drift/regression | Medium | Medium | Stribol | Registry gates, bias checks, rollback |
| Scope creep to heavy crypto | Low | Medium | Elara | OPRF/ECDH only |
