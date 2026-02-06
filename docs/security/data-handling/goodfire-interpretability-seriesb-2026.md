# Goodfire Series B Interpretability Monitoring - Data Handling

## Classification
- Probe prompts: **Internal**.
- Probe responses: **Internal**.
- Artifacts (`report.json`, `metrics.json`, `stamp.json`, `profile.json`): **Internal Restricted**.

## Retention
- CI artifacts retained for 14 days (assumption pending platform settings confirmation).
- Local artifacts must be scrubbed after review unless explicitly archived.

## Never-Log List
- API keys, Authorization headers, cookies.
- System prompts and private tool outputs containing secrets.
- Raw provider error payloads that include credentials.

## Threat-Informed Requirements (Deny-by-Default)

| Threat | Mitigation | Gate | Test Case |
| --- | --- | --- | --- |
| Prompt injection leaks secrets | Never feed secrets; strip env; redact logs | CI policy: fail if logs contain key-like tokens | Fixture with fake key → ensure redaction |
| Monitor becomes jailbreak oracle | Keep probes non-actionable; forbid exploit instructions in artifacts | Schema forbids exploit instruction fields | Schema + snapshot tests |
| PII in prompts/responses | PII scrubber + never-log list | CI: fail if PII regex hits artifacts | Fixtures with emails/phones |

## MAESTRO Security Alignment
- **MAESTRO Layers**: Data, Tools, Observability, Security.
- **Threats Considered**: prompt injection, data exfiltration, tool abuse, PII leakage.
- **Mitigations**: redaction, schema validation, CI gating, deterministic artifacts.

## Evidence Requirements
- Deterministic evidence artifacts with schema validation.
- Redaction evidence via unit test fixtures for secrets + PII.

## Operational Constraints
- Feature flag defaults OFF for runtime enforcement.
- CI is the first enforcement surface for compliance.
