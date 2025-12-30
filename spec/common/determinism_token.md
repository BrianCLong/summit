# Determinism Token

**Purpose:** Encapsulate all replay-critical parameters to enable deterministic recomputation of metrics and simulations.

**Fields**

- Snapshot identifiers (graph/index versions).
- Random seed or RNG stream ID.
- Time window constraints.
- Schema/config versions.
- Optional execution environment hash (container image digest).

**Usage**

- Included in artifacts and macro capsules; downstream simulators require the token before execution.
- Combined with witness chain anchors to lock execution context.
