# Security Threat Model: Simulation & Agents

## Threats
1.  **Prompt Injection**: Malicious text in retrieved memory or scenario inputs overrides agent instructions.
    *   **Mitigation**: Strict separation of system prompt and user/retrieved content. Deny-by-default memory policy.
    *   **Verification**: `tests/test_prompt_injection_memory_boundary.py`

2.  **Sensitive Attribute Leakage**: Psychographic profiles leaked in logs.
    *   **Mitigation**: `never_log` fields in schema (future). Redaction in evidence emitter.
    *   **Verification**: Manual audit of `evidence/report.json`.

3.  **Determinism Drift**: Simulation results change due to unpinned seeds or timestamps.
    *   **Mitigation**: No timestamps in output except `stamp.json`. Explicit seeds in `RunSpec`.
    *   **Verification**: `tools/ci/verify_no_timestamp_outside_stamp.py`

## Gates
*   `ci/summit-bundle-verify`: Enforces all checks above.
