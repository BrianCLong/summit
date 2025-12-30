# Threat Model

**Adversaries**

- Malicious feeds injecting contradictory or noisy evidence.
- Attempts to bypass privacy/egress limits when sharing evidence capsules.
- Replay attacks falsifying lifecycle state transitions.

**Mitigations**

- Provenance-weighted decay resists untrusted sources.
- Policy tokens + redaction enforce privacy budgets.
- Witness chain and Merkle commitments bind lifecycle updates to evidence set; determinism token enables replay.
