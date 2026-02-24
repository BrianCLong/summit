# Security & Data Handling: SAGE

## Threats & Mitigations
1. **Prompt Leakage via Hints**:
   * **Risk**: Privileged hints (from τ*) might contain sensitive solution data.
   * **Mitigation**: Hints are only injected during training. Logs must redact raw hint text.

2. **Training/Inference Mismatch**:
   * **Risk**: Hints accidentally enabled during inference.
   * **Mitigation**: `SageRolloutWrapper` strictly checks `mode="inference"` and logs critical errors if hints are requested.

## Retention
* Metrics (mixed-outcome rates) are retained.
* Raw training prompts with hints should not be persisted in production logs unless redacted.
