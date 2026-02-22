# Summit Switchboard Disambiguation

As the Summit ecosystem grows, several components share similar names. This document clarifies the terminology.

| Term | Scope | Responsibility | Key Characteristics |
|------|-------|----------------|---------------------|
| **Summit Switchboard** | **Control Plane** | Discovery, Capability Selection, Policy Enforcement, Credential Brokering, Health, Lifecycle, Receipts. | **Deny-by-default**, Replayable Receipts, Deterministic Trace IDs. The "Brain" of routing. |
| **Agent Switchboard** | **Data Plane** | Message Transport, Durable Agent Comms, Redis Streams Bus. | High-throughput, low-latency message passing. The "Nervous System". |
| **Summit MCP Server** | **Orchestration/Proxy** | Exposes Summit capabilities to MCP clients (Claude, IDEs). | Acts as a gateway/proxy. Often confusingly called "Switchboard" in early docs. |

### Ecosystem Name Collisions

*   **Switchboard (Solana/Oracle)**: Unrelated blockchain oracle network.
*   **Switchboard (Google)**: Internal tool, unrelated.
*   **Switchboard (Microsoft)**: Various internal projects, unrelated.

**Canonical Usage:**
Always use **"Summit Switchboard"** for the control plane.
Always use **"Agent Switchboard"** for the data plane (Redis/Streams).
