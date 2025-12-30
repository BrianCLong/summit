# Transparency Log

Defines the transparency log shared across origin, collision, migration, macro, and correlation receipts.

## Requirements
- Append-only with monotonic sequence numbers.
- Stores receipt hash, replay token, attestation status, and provenance pointer.
- Supports verification of Merkle proofs to recover evidence membership.
- Exposes audit API for regulators and governance.

## Operations
- **Append**: accept receipts after validation against budget and schema versions.
- **Query**: filter by tenant, time window, wedge type, attestation status.
- **Replay**: hand-off to replay service with deterministic token.
- **Export**: redacted export honoring egress and jurisdiction constraints.
