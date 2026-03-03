# Info Warfare Threat Model

## Abuse Cases

1. **Targeting Groups:** Misuse of narrative mapping to identify and target vulnerable populations.
2. **Dual-Use Leakage:** Exporting defensive methodologies that can be inverted for offensive use.
3. **Data Poisoning:** Injecting false evidence to bias attribution.

## Controls

- **Rate Limits:** Enforced on all analytics endpoints.
- **Access Control:** RBAC required for viewing SENSITIVE classified sitreps.
- **Redaction:** Automatic PII scrubbing in ingestion pipelines.
- **Evidence Verification:** Deterministic policy gates for SITREP generation.
