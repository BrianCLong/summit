# ADR-0001: Connector SDK

## Context

We need a standard way to build connectors that acquire data and emit canonical, deterministic evidence for the Summit moat.

## Decision

Introduce a `connector-sdk` package providing JSON schemas, TypeScript contracts, and hashing utilities to enforce deterministic artifact generation.

## Consequences

- Every connector will strictly adhere to the defined schemas.
- Evidence lineage can be verified cryptographically based on the deterministic hashes.
