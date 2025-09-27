# Sprint 11 Risk Register

| Risk | Likelihood | Impact | Owner | Mitigation |
| ---- | ----------:| ------:| ----- | ---------- |
| Cross-tenant cache leakage | Medium | High | Starkey | Per-tenant keys, KMS encryption |
| Residency violation | Low | High | Foster | Enforce allowlists and waivers |
| Split-brain failover | Low | High | Elara | Health checks before promotion |
| Cost overrun | Medium | Medium | Magruder | Budget caps and telemetry |
