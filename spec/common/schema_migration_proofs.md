# Schema Migration Proofs

## Objective

Compile ontology schema changes into deterministic migration plans with
compatibility proofs and optional shadow execution.

## Artifacts

- `schema_delta` (type, field, or action changes)
- `migration_plan` (ordered steps with replay token)
- `compatibility_shim` (rewrite rules + signatures)
- `compatibility_proof` (proof object or breakage certificate)

## Proof Requirements

- Bind proof to `schema_delta` and policy version.
- Record deterministic diff results for shadow execution.
- Emit receipts to transparency log.
