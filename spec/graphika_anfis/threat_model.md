# Threat Model

**Adversaries**

- Coordinated influence operators attempting to evade detection via link laundering or timing obfuscation.
- Insider manipulating intervention plans to bias mitigation outcomes.
- Replay or tampering attacks on attribution artifacts.

**Mitigations**

- Witness chains on each feature computation and simulation run.
- Merkle commitments over content identifiers; redaction enforcement per policy token.
- Determinism token + replay token to ensure recomputable outcomes.
- Optional TEE attestation for sensitive runs.
