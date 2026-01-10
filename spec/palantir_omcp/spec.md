# Palantir — OMCP: Ontology Migration Compiler with Compatibility Proofs

## Overview

OMCP compiles ontology schema changes into migration plans and compatibility
shims. It produces proof objects or breakage certificates for safe rollout.

## Architecture

- **Schema Differ**: compute delta between prior and updated schemas.
- **Compiler**: generate migration plan and compatibility shim.
- **Verifier**: validate compatibility conditions and policy invariants.
- **Shadow Runner**: execute old/new workflows and produce deterministic diffs.
- **Proof Emitter**: issue compatibility proofs, breakage certificates, receipts.

## Data Contracts

- `schema_delta`
- `migration_plan`
- `compatibility_shim`
- `compatibility_proof`

## Policy & Compliance

- Policy-as-code invariants must be verified for updated schemas.
- Breakage certificates trigger governance review.
