# Data Handling: MARS Reflective Search

## Classification
- **Inputs**: Prompts, code diffs, candidate solutions.
- **Outputs**: `plan.json`, `ledger.json`, `lessons.json`, `metrics.json`, `stamp.json`.

## Never-Log Policy
The following fields must never be logged or included in artifacts:
- API keys (redacted via `summit/mars/redact.py`).
- Credentials/Tokens.
- Raw proprietary dataset contents.

## Redaction Mechanisms
- **Secrets**: Regex-based redaction of common API key patterns (e.g., `sk-...`).
- **Injection Resistance**: Removal of `<script>` tags from solution diffs.
- **Verification**: `tests/mars/test_mars_reflection_diff_lessons.py` includes a policy regression test for malicious payloads.

## Retention
- Artifacts are stored under `artifacts/<EVIDENCE_ID>/`.
- Retention is governed by the global Summit Compliance policy.
- Large artifacts should be referenced by hash rather than stored in full in `lessons.json`.
