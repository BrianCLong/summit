# Witness Chain

**Purpose:** Immutable, auditable trail for tool calls, transforms, and actions.

**Elements**

- Step commitments: hash of {inputs, outputs, parameters, policy decision ID}.
- Sequence anchoring: hash chaining with per-step nonce to prevent reordering.
- Ledger integration: append-only storage with timestamp and signer identity.
- Optional TEE attestation quote binding runtime measurement to trace digest.

**Operational Guidelines**

- Every service appends its own step; no shared mutability.
- Replay tokens must reference the witness chain root for deterministic recomputation.
- Use compact CBOR/Protobuf encoding to minimize size while preserving deterministic ordering.
