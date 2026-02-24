# Security: Narrative IO Inference & Convergence (Data Handling)

## Threat Model & Mitigations

1. **Weaponization for targeted persuasion**
   - **Mitigation:** Require analysis outputs at **aggregate** level (cluster-level).
   - **Gate:** CI schema denies `user_id` sinks.
   - **Test:** Fixture attempting to include per-user microtargeting fails.

2. **Overconfident attribution**
   - **Mitigation:** Enforce confidence calibration + “unknown” class; require evidence pointers.
   - **Gate:** Unit test rejects missing evidence refs.

3. **Prompt/LLM hallucination in inference extraction**
   - **Mitigation:** Deterministic extractor must be **rule+model hybrid** with “extracted spans + rationales” required.
   - **Gate:** Test ensures every inferred default links to supporting text spans.

4. **Privacy leakage**
   - **Mitigation:** PII redaction in evidence pack; never store raw full text unless permitted.
   - **Gate:** Fixture with emails/tokens produces redaction report.
