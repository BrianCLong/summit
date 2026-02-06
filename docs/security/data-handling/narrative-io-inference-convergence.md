# Narrative IO — Inference + Convergence Data Handling

## Purpose

Define misuse-resistant data handling rules for inference extraction and convergence analytics.

## Threat → Mitigation → Gate → Test

1. **Weaponization for targeted persuasion**
   - **Mitigation**: Aggregate-only outputs (cluster-level). Disallow per-user targeting fields.
   - **Gate**: CI schema denies `user_id`, `device_id`, or direct targeting keys.
   - **Test**: Fixture with per-user fields fails schema validation.

2. **Overconfident attribution**
   - **Mitigation**: Enforce calibrated confidence and “unknown” class; require evidence pointers.
   - **Gate**: Schema requires confidence bounds and evidence references for any actor-role inference.
   - **Test**: Unit test rejects missing evidence references.

3. **Inference hallucination**
   - **Mitigation**: Rule+model hybrid extractor with span-anchored rationales.
   - **Gate**: Span anchoring gate for every inferred default.
   - **Test**: Fixture with missing spans fails validation.

4. **Privacy leakage**
   - **Mitigation**: PII redaction in evidence pack; raw full text only if policy already permits.
   - **Gate**: Redaction report required for outputs containing emails/tokens.
   - **Test**: Fixture with PII produces redaction report and sanitized outputs.

## Determinism & Evidence

- All outputs are deterministic and fixture-backed.
- Evidence pointers are mandatory and verifiable.

## MAESTRO Threat Alignment

**MAESTRO Layers**: Data, Observability, Security.

**Threats Considered**: Data leakage, inference misuse, prompt manipulation.

**Mitigations**: Aggregation-only outputs, deny-by-default schema, span-anchored evidence.
