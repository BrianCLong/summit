# Sprint 21 Plan

## Goals
- Enforce TEE attestation for all clean room executions.
- Introduce data products and entitlement licensing with epsilon caps.
- Provide streaming differential privacy aggregates over Kafka micro-batches.

## Scope
- Attestation verifier service and OPA policy gates.
- Catalog and licensing APIs for data products.
- Streaming DP aggregator with k-anonymity and epsilon budgeting.

## Non-Goals
- Real payment processing.
- Support for non-SGX/TDX/SEV-SNP TEEs.

## Timeline
- Sprint length: 2 weeks after Sprint 20.
- Mid-sprint demo at end of week 1.
- Code freeze 48h before sprint end.

## Ceremonies
- Daily stand-up, backlog grooming, sprint review, retrospective.

## Definition of Done
- `make sprint21` passes.
- All new policies and tests run in CI.
- No debug or bypass flags in production paths.

## Backlog
- Attestation verifier with allowlists.
- Entitlement issuance and revocation.
- Streaming DP aggregator enforcing k≥25 and epsilon budgeting.
- DSAR tooling for product artifacts.
