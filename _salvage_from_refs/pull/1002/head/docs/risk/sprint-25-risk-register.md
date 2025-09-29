# Sprint 25 Risk Register

| Threat | Likelihood | Impact | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Malicious template upload | Medium | High | Starkey | Sandbox without network, static lint, fuzz differencing, OPA gates, TEE runs |
| Non-DP or k-anon bypass | Medium | High | Foster | DP API allowlist, k≥25, ε caps, automated proofs & transparency |
| Provenance spoof | Low | High | Oppie | Dual EC+PQC signatures, SLSA-3 attestations, transparency anchors |
| Revenue miscalc | Medium | Medium | Magruder | Test-mode payouts, reconciliation reports |
| Verification perf regressions | Medium | Medium | Elara | Deterministic builds, cached runs, SLO alarms |
