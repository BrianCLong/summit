# Graph+Vector Interop & Standards (Graph Hybrid)

## What Summit Supports (Contract-first)

- Portable Hybrid Retrieval Contract with adapter stubs gated by feature flags.
- Deterministic evidence bundles (report, metrics, stamp) for retrieval governance.
- Deny-by-default policy fixtures for tenant-scoped retrieval.

## Mapping to ISO GQL Concepts (High Level)

- Property graph entities align to GQL node/edge concepts.
- Query semantics map to contract inputs (tenant, query, hop limits).
- GQL adoption is tracked as a portability signal, not a runtime requirement.

## Portability Notes

- Neo4j: property sharding readiness informs scale-out narrative and adapter design.
- Neptune: GraphRAG storage patterns inform contract inputs and evidence capture.
- TigerGraph: hybrid graph+vector claims inform contract portability expectations.

## Evidence & Policy Guarantees

- Evidence IDs are stable and indexed for deterministic auditability.
- Policy enforcement is deny-by-default with allowlist rules.

## Claim-Safe Positioning

- Summit can claim policy-gated hybrid retrieval scaffolding with deterministic evidence.
- Summit does not claim vendor performance superiority without benchmark evidence.

## Non-Goals

- Full GQL runtime implementation is intentionally constrained.
- Production adapters remain deferred until conformance gates are validated.
