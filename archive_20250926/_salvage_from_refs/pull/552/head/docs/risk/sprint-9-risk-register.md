# Sprint 9 Risk Register

| Threat | Likelihood | Impact | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Model artifact tampering | Low | High | Starkey | Hash-locked artifacts, signed bucket, checksum in CI |
| Embedding leakage (biometrics) | Medium | High | Foster | DLP-by-default, DSAR purge tool, gated exports |
| Auto-release bypass | Low | High | Oppie | Human review mandatory, no auto-dequarantine |
| Merge errors in ER v2 | Medium | Medium | Magruder | Reversible merges, preview diff, provenance ledger |
| Queue backlog (HITL) | Medium | Medium | Elara | Backpressure + alerts; reviewer SLA dashboard |
