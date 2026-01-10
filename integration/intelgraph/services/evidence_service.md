# Evidence Service

## Responsibilities

- Validate evidence bundles and policy decision tokens.
- Enforce redaction policies before any export.
- Emit verification results and witness append tokens.

## Inputs

- Evidence bundle (see `spec/common/evidence_bundle.md`).
- Policy decision tokens.

## Outputs

- Verification response with `verified=true` or error list.
- Witness append token for logging verification in witness ledger.

## Operational Notes

- Must reject bundles with invalid signatures or mismatched Merkle roots.
- Persist verification records in compliance ledger.
