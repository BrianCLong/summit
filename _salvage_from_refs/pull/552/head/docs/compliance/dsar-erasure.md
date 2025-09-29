# DSAR Erasure Process

Derived biometric data such as embeddings, perceptual hashes, and detector metadata
are treated as sensitive identifiers.

## Request Handling
1. Verify requester identity and authorization.
2. Locate records via subject ID using `scripts/compliance/dsar_purge.py --dry-run <id>`.
3. Review output and obtain approval before running live purge.

## Purge Execution
- Run `scripts/compliance/dsar_purge.py <id>` to remove derived features.
- Script logs actions to the provenance ledger for audit.
- Set `ENABLE_SENSITIVE_EXPORTS=true` only if exports are explicitly approved.

## Safety Notes
- Purge is irreversible; ensure backups are available.
- All actions recorded in audit log and Splunk with redaction by default.
