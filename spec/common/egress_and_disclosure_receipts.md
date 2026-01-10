# Egress & Disclosure Receipts

## Purpose

Record outbound network activity and selective disclosure decisions for scoped OSINT and coalition exports.

## Receipt Fields

- Scope token ID
- Destination allowlist classification
- Bytes transferred and entity counts
- Policy decision references
- Replay token for verification

## Enforcement

- Egress budgets enforced per scope
- Active probing blocked without authorization token
- Receipts stored in transparency log
