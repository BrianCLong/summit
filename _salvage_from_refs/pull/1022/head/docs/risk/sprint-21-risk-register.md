# Sprint 21 Risk Register

| Threat | Likelihood | Impact | Mitigation |
|-------|-----------:|------:|-----------|
| Fake or forged attestation | Medium | High | Verify quotes, allowlist measurements, audit logs |
| Entitlement token abuse | Medium | High | Capability-scoped tokens, short TTL, revocation |
| Streaming DP leakage | Medium | High | k≥25, clipping, epsilon budgeting with cooldown |
| Dev bypass in production | Low | High | Pre-commit check for debug flags, OPA enforcement |
