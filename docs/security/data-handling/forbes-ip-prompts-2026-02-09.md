# Security & Data Handling: IP Capture

## Classification
- **User Corpora:** Confidential (High). Treated as user-owned IP.
- **Outputs:** Confidential (High). Contains distilled IP.
- **Logs:** Public/Internal (Low). Must NOT contain corpus content.

## Threat Model

| Threat | Mitigation | Gate |
| :--- | :--- | :--- |
| **PII Leakage** | Redaction regexes applied before processing. "Never-log" policy for raw text. | CI `ip_capture_security` |
| **Prompt Injection** | Input treated as data, not code. No `eval()` or unchecked tool use. | CI Injection Tests |
| **Data Persistence** | Outputs written to local ephemeral paths. No central storage by default. | Runbook |
| **Hallucination** | Strict "evidence linking" required. Every claim must cite a source span. | Schema Validation |

## Never-Log List
- Raw input corpus text.
- Extracted PII (names, emails, phones).
- Access tokens or API keys found in corpus.
- Client names (unless allowlisted).

## Retention
- **Local Runs:** User responsibility to delete `out/`.
- **CI Artifacts:** Standard retention (e.g., 30 days), access controlled.
