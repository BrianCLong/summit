# REN Data Handling

## Privilege Partitioning
- **Public**: Accessible to all analysts.
- **Sealed**: Requires specific authorization.
- **Privileged**: Never logged, processed in ephemeral memory only.

## Data Minimization
- Store hashes (`content_hash`) instead of full text where possible.
- Redact PII automatically.
