# Sprint 26 Risk Register

| Threat | Likelihood | Impact | Mitigation |
| --- | ---: | ---: | --- |
| ZK proving latency spikes | Medium | High | Batch proofs, pre-compile circuits, timeouts |
| Proof forgery / weak circuits | Low | High | Transparent circuits, auditor fixtures |
| Over-disclosure via proof metadata | Medium | High | PII-off transcripts, DSAR erase |
| Supply chain spoof | Low | High | SLSA-4 provenance, dual signatures |
| Gaming reputation | Medium | Medium | Anti-sybil weights, cooldowns, human review |
