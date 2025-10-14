# Data Spine Residency Audit

The `data-spine audit residency` command generates a JSON artifact summarizing residency controls for every contract. The current report is stored at `services/data-spine/reports/residency-audit.json` and was generated using the CLI to support compliance evidence requirements.

Key observations:

- All contracts declare residency boundaries and deterministic, reversible handling for PII fields.
- No non-compliant contracts were detected; lower environment handling is set to tokenize or redact wherever PII is present.
- The report includes timestamps to support audit traceability and can be regenerated as part of CI.
