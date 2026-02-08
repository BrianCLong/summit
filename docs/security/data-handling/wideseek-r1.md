# WideSeek-R1 Data Handling & Security

## Classification
- **Tool Outputs**: Untrusted External Content. Must be sanitized before ingestion.
- **Run Artifacts**: Internal Use Only (until reviewed).

## Retention Policy
- Raw HTML/Tool Dumps: **Hash-only** storage or temporary (TTL 24h).
- Summaries: Retained indefinitely for training/eval.

## Never-Log List
The following must NEVER be logged in plain text:
- Full URLs with sensitive query parameters (e.g., `token=`, `key=`).
- Raw HTML content (too large, potential XSS/injection).
- User-provided secrets or PII.

## Mitigations
1. **Misuse (Scraping)**: Enforced via `WideSeekBudgets` (max requests) and `WideSeekPolicy` (allowlist).
2. **Injection**: `sanitize_tool_output` runs on all `access()` returns.
3. **Leakage**: `redact_text` runs on all log entries from the orchestrator.
