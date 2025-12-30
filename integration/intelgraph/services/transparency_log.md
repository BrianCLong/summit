# Transparency Log Service

Manages append-only log entries for receipts across all wedges.

## Features
- Accepts entries only after policy gateway validation.
- Stores hash, sequence number, replay token, attestation status, and provenance pointer.
- Supports queries by tenant, wedge type, attestation flag, and time window.
- Provides export pipeline honoring egress and jurisdiction constraints.
