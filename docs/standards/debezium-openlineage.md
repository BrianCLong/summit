# Debezium OpenLineage Subsumption Standard

## Scope

This standard defines the Summit subsumption bundle for Debezium 3.4 OpenLineage emissions used in
CDC-first PostgreSQL to Neo4j mirroring. Enforcement is intentionally constrained to a document-first
scaffold until the verifier and ingest adapters are activated.

## Alignment and Authority

Summit readiness alignment is governed by `docs/SUMMIT_READINESS_ASSERTION.md` and the governance
hierarchy described in `docs/governance/CONSTITUTION.md`. Subsumption artifacts must align with
these authority files and the evidence schemas under `evidence/schemas/`.

## Requirements

- Bundle artifacts MUST remain deterministic and reviewable.
- Lineage references MUST use OpenLineage naming conventions (namespace + name).
- Non-authoritative lineage inputs are denied by default unless explicitly allow-listed.

## Governed Exceptions

Legacy deviations are tracked as governed exceptions. Any exception requires a rollback plan and a
DecisionLedger entry. Deferred pending verifier activation.

## Deployment Notes

No runtime behavior is introduced by this scaffold. Activation of ingestion or drift detection is
intentionally constrained until a gated PR enables the feature flag.
