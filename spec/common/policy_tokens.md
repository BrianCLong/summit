# Policy Decision Tokens

**Purpose:** Bind policy evaluation outcomes to artifacts and execution traces.

**Contents**

- Subject, purpose, effect signature (read/write/export).
- Policy version and ruleset identifier.
- Decision outcome, obligations, and expiry.
- Signature by policy gateway and optional attestation reference.

**Integration**

- Emitted by policy gateway on every authorize/check call.
- Stored alongside witness chain commitments and evidence bundles.
- Referenced by macro artifacts to prove gating and compliance.
