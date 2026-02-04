# Security & Data Handling: Kimi K2.5

## Threat Model

### 1. Prompt Injection via Images
*   **Threat**: Malicious instructions embedded in images.
*   **Mitigation**: Strip/segregate untrusted image-derived instructions. Require explicit user confirmation for sensitive actions.
*   **Gate**: CI static policy tests.

### 2. Tool-Call Spoofing / Schema Drift
*   **Threat**: Model hallucinating tool calls or using wrong schema.
*   **Mitigation**: Strict JSON schema validation + deny-by-default tool allowlist.
*   **Gate**: `toolcall-conformance` CI job + unit tests.

### 3. Long-Horizon Runaway
*   **Threat**: Model entering an infinite loop of tool calls (200-300 call capability).
*   **Mitigation**: Hard caps:
    *   Max tool calls per run: **25** (default).
    *   Max tokens: Budgeted.
    *   Budgeted wall time.

### 4. Secret Leakage in Logs
*   **Threat**: API keys or sensitive user data appearing in logs.
*   **Mitigation**: "Never-log" policy.
    *   Redact API keys.
    *   Redact raw user prompts.
    *   Redact image URLs if sensitive.
    *   Redact tool arguments containing PII.

## Policy
*   **Never-log list**: API keys, raw user prompts, confidential model outputs.
*   **Default Context**: 32K (overrideable to 256K).
