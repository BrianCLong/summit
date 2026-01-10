# Correlation Tokens

## Purpose

Scope and limit cross-entity correlation by requiring tokens that define
permitted identifier types, hop limits, TTL, and egress constraints.

## Token Fields

- `token_id`
- `tenant`
- `purpose`
- `allowed_identifier_types[]`
- `max_hops`
- `ttl`
- `egress_budget`
- `jurisdiction`
- `signature`

## Enforcement Points

- module execution (pre-run validation)
- graph materialization (link creation)
- export/egress (redaction and budget checks)

## Receipts

Every linking action generates a receipt with the token and linked identifiers
stored in the transparency log.
