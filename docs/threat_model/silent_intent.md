# Threat Model: Silent Intent Modality

## Threats
1. **Covert Surveillance**: Using micro-movements to infer speech or identity without consent.
   - *Mitigation*: Strict class gating and consent tokens.
2. **Data Leakage**: Raw biometric features being logged or persisted.
   - *Mitigation*: Never-log fields in policy and zero-day retention.
3. **Model Inversion**: Reconstructing facial features from micro-signals.
   - *Mitigation*: Feature-level abstraction and noise injection.

## Security Gates
- `summit-neverlog`: Scans for biometric key leaks.
- `EVD-APPLEQAI-PRIV-002`: Verification of gate effectiveness.
