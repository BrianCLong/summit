# Security Ledger

This directory stores deterministic, machine-validatable security ledger entries. It acts as the immutable record for governance and compliance events related to the repository.

## Contract

All ledger entries must strictly adhere to the defined JSON schema located at `schemas/governance/security-ledger.schema.json`.

**Key Constraints:**
- **Deterministic Timestamps**: All `timestamp` fields must be exact ISO-8601 UTC formats (e.g., `2023-10-24T12:00:00Z`). Milliseconds or non-UTC time zones are strictly prohibited to ensure build determinism.
- **Immutability**: Once an entry is committed, it should not be modified.
- **Evidence Reference**: Every ledger entry must contain an `evidence_ref` that maps back to supporting documentation or artifacts. Use the definitions in `evidence-map/security-ledger-map.yaml` to match event types to their corresponding artifacts.

## Adding Entries

To add an entry, create a JSON file in this directory following the schema. Example entry (`ledger-entry-001.json`):

```json
{
  "id": "e4f8d9b1-7a2e-4b8c-a123-b6d45e7f8a9c",
  "timestamp": "2023-10-24T12:00:00Z",
  "event_type": "branch_protection_audit",
  "actor": "github_actions[bot]",
  "outcome": "success",
  "evidence_ref": "artifacts/branch-protection-audit.json",
  "version": "1.0.0"
}
```

## Validation

All ledger entries are validated in CI to ensure compliance with the contract. You can validate locally using the provided script:

```bash
./scripts/determinism/validate-security-ledger.sh
```

If the validation fails, the script will exit with a non-zero status code and list the invalid files.
