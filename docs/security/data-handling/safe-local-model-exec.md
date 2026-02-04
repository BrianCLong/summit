# Data Handling: Safe Local Model Execution

## Data Classifications

| Class | Description | Runner Requirement |
| :--- | :--- | :--- |
| **Public** | Open weights, public prompts | Default configuration |
| **Internal** | Internal documents, non-sensitive | Hardened mode recommended |
| **Restricted** | PII, Credentials, Strategic keys | **Hardened mode mandatory** (`SUMMIT_MODEL_RUNNER_HARDENED=1`) |

## Hardened Mode Invariants
When processing **Restricted** data:
1.  **Egress**: Must be strictly `deny_all: true` with no exceptions.
2.  **Mounts**: Only read-only data mounts allowed.
3.  **Audit**: Full redact-on-write enabled for stderr.

## Never-Log List (Redaction Rules)
The following patterns must be redacted from audit logs and receipts:
- Environment variables containing `KEY`, `TOKEN`, `SECRET`, `PASSWORD`.
- SSH Private Keys (`-----BEGIN RSA PRIVATE KEY-----`).
- Cloud Provider Credentials (AWS Access Keys, etc.).
- Verbatim Restricted prompts (if `REDACT_PROMPTS=1`).

## Retention & Rotation
- **Receipts**: Retained for 90 days for compliance auditing.
- **Audit Logs**: Rotated daily or when reaching 10MB.
- **Temp Files**: Purged immediately upon container exit (`CLAIM-10`).
