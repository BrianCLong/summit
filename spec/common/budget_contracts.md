# Budget Contracts

**Purpose:** Explicit limits for latency, expansion, bytes, and privacy to bound compute and data exposure.

**Parameters**

- p95 latency target and hard timeout.
- Max expansion count (e.g., branching factor in simulations or search).
- Max egress bytes and retention time.
- Privacy budget (epsilon/delta or custom cost function).

**Behavior**

- Enforced per service call; violations abort execution and annotate witness chain.
- Budget contracts are part of replay tokens to ensure consistent evaluation during reruns.
