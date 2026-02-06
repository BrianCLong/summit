# Security & Data Handling: Narrative IO Inference & Convergence

## Threat Model

### 1. Weaponization for Targeted Persuasion
*   **Risk:** Adversaries using analysis to micro-target vulnerable users.
*   **Mitigation:** Analysis outputs are **aggregate only** (cluster-level).
*   **Gate:** CI schema check denies `user_id` sinks in evidence output. Fixture tests attempting to include per-user microtargeting must fail.

### 2. Overconfident Attribution
*   **Risk:** Summit being used to falsely accuse actors based on weak signals.
*   **Mitigation:** Enforce confidence calibration. "Unknown" class is mandatory.
*   **Gate:** Code requires evidence pointers (support spans) for any inference. Unit tests reject outputs missing evidence refs.

### 3. Hallucination in Inference Extraction
*   **Risk:** LLM/Model hallucinating implications that don't exist.
*   **Mitigation:** Hybrid Rule+Model approach. Deterministic extractor.
*   **Gate:** Every inferred default must be anchored to specific text spans.

### 4. Privacy Leakage
*   **Risk:** PII in source documents leaking into public reports.
*   **Mitigation:** PII redaction in evidence pack.
*   **Gate:** Test fixtures with emails/tokens must produce redacted output.

## Data Retention
*   Raw inputs: Retained according to core Summit policy (default 30 days).
*   Evidence packs: Retained for governance audit (1 year).
