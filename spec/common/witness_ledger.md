# Witness Ledger Reference

## Purpose

Provide a shared ledger pattern for storing commitments, witnesses, and replay tokens across CIRW, FASC, PQLA, SATT, and QSDR artifacts.

## Ledger Properties

- **Append-only:** Entries hash-chained for tamper evidence.
- **Tenant Scoped:** Partitioned by tenant with federation tokens required for cross-tenant reads.
- **Typed Entries:** Identity resolution witness, calibration justification, compliance artifact proof, transform license receipt, and recon kill audit.
- **Determinism Fields:** Snapshot identifiers, seed values, model/config versions.

## Entry Schema (abstract)

- `entry_id`: UUIDv7
- `entry_type`: {`cirw`, `fasc`, `pqla`, `satt`, `qsdr`}
- `commitment_root`: Merkle or single hash commitment
- `support_set`: Minimal features/evidence used for the decision
- `replay_token`: {`snapshot_id`, `seed`, `version_set`}
- `policy_scope`: Allowed export/tenant constraints
- `timestamp`: RFC 3339
- `signature`: Signer binding entry to governance authority

## Operations

1. **Write:** Validate attestation/policy scope, persist entry, emit transparency log anchor.
2. **Query:** Filter by entry_type, time window, or policy scope; enforce redaction rules before return.
3. **Audit Export:** Batch export with selective disclosure; include path proofs for referenced commitments.

## Storage Targets

- Primary: Immutable log store (e.g., write-once object storage or ledger DB).
- Indexes: Query signatures for fast lookup of repeated analytics or calibration requests.
