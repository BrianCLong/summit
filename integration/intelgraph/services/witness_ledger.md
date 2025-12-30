# IntelGraph Witness Ledger Service

## Responsibilities

- Persist witnessed artifacts from CIRW, FASC, PQLA, SATT, and QSDR.
- Provide append-only, hash-chained storage with tenant scoping and inclusion proofs.
- Expose query APIs for auditors to fetch entries by type, time window, or policy scope.

## Interface Highlights

- `POST /ledger/entries`: store commitment_root, entry_type, support_set, determinism_token.
- `GET /ledger/entries`: filter by entry_type, tenant, or time range; applies disclosure constraints.
- `GET /ledger/proof/{id}`: inclusion proof for transparency log anchor.

## Dependencies

- Transparency log for anchoring entries.
- Policy gateway for authorization decisions.
