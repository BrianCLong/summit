# Palantir — OMCP: Ontology Migration Compiler with Compatibility Proofs

## Overview
OMCP compiles ontology schema changes into migration plans and compatibility shims, verifies compatibility conditions, and emits compatibility proofs or breakage certificates with replay tokens.

## Architecture
- **Schema Delta Analyzer**: computes type/field/action signature changes between prior and updated schemas.
- **Migration Plan Compiler**: generates data transformation scripts for stored data.
- **Compatibility Shim Generator**: builds rewrite rules mapping prior client requests to updated schema requests.
- **Verification Engine**: checks type correctness, policy invariants, and rewrite termination; performs optional shadow execution for deterministic diffs.
- **Proof & Certificate Emitter**: creates compatibility proof objects or breakage certificates with witness chains and replay tokens; logs to transparency log.

## Data Contracts
- **Schema delta**: type changes, field changes, action signature changes.
- **Migration artifact**: migration plan, compatibility shim, compatibility proof or breakage certificate, replay token, attestation quote?, witness chain.
