# Case Export Sanitization

Exports remove personal data and credentials by default.
Included:
- Case metadata and timeline.
- Evidence names and SHA-256 hashes.

Removed:
- PII such as emails, biometrics.
- Raw evidence content unless explicitly requested.

Each export references audit log entries for chain-of-custody.
