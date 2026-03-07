# summit-memory

Summit Memory is an append-only, bitemporal, promotion-governed memory control plane.

## Design goals

- append-only WriteSet ledger
- bitemporal replay (`event_time`, `ingest_time`)
- RG/BG/NG materialized memory views
- provenance-first promotion and quarantine
- deterministic replay and evaluation

## Initial scope

This package provides:
- schemas
- memory-building helpers
- temporal replay scaffolding
- conflict detection stubs
- promotion lifecycle stubs
- golden-path tests

## Non-goals in this PR

- live vector DB integration
- live graph DB integration
- online model training
- distributed scheduler/runtime work
