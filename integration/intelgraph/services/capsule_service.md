# Capsule Service

## Purpose

Coordinates assembly and persistence of evidence capsules across wedges.

## Responsibilities

- Assemble capsule artifacts and commitments.
- Validate replay tokens and disclosure budgets.
- Register transparency log entries and witness chains.

## Interfaces

- `POST /v1/capsules` to create a capsule.
- `GET /v1/capsules/{id}` to retrieve capsule metadata.

## Dependencies

- Policy engine for authorization decisions.
- Witness ledger for audit chaining.
- Transparency log for immutable registration.
