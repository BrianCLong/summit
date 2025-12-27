# Data Integrity Toolkit

This package centralizes schema evolution checks, migrations safety, invariants, reconciliation, event log canonicalization, deterministic hashing, transactional write boundaries, and roundtrip verification utilities. It is designed to be additive tooling without modifying runtime behavior of existing services.

## Commands

- `npm test --workspace @ga-graphai/data-integrity`
- `npm run schema:check --workspace @ga-graphai/data-integrity`

## Modules

- `canonical/`: deterministic JSON canonicalization and hashing helpers.
- `schema/`: versioned schema registry with compatibility checks and CLI gate.
- `migrations/`: resumable migration runner with preflight, dry-run, and rollback markers.
- `invariants/`: runtime boundary and audit invariant helpers.
- `reconcile/`: deterministic cross-store reconciliation reports.
- `eventlog/`: append-only canonical event log with hash-chain verification.
- `write-boundary/`: transactional wrapper with partial write detection.
- `roundtrip/`: export/import roundtrip verification helpers.
