# Executive Summary: Summit Governed Agent Architecture

**Status:** Proposed
**Target:** GA Readiness
**Source Signal:** Vercel "AI Code Elements" + Summit Governance Mandates

## Why This Matters for GA

Vercel's release demonstrates that the industry is moving toward **explicit, composable agent configurations** (ToolLoopAgent). However, standard implementations lack the **regulatory-grade lineage** required for Summit's government/intelligence customers.

By wrapping the Vercel-style "Agent Manifest" in our **Provenance Ledger**, we convert a commodity feature into a **strategic moat**:
1.  **Auditability**: We can prove exactly *which* instructions and tools were active for any past agent decision.
2.  **Compliance**: We enforce policy-as-code (OPA) *before* the agent can invoke a tool, preventing "prompt injection" from becoming "action injection."
3.  **Determinism**: Explicit versioning and hashing enable "Time Travel Debugging" for agent behavior.

## Recommendation: Phased Implementation

### Phase 1: Immediate (The "Hard" Core)
*   **Deploy the Schema**: Enforce `agents/manifest.schema.json` for all new agents.
*   **Implement the CI Gate**: Block PRs that add agents without valid manifests and instruction hashes.
*   **Deploy the Governance Kernel**: The runtime wrapper that intercepts tool calls.

### Phase 2: Deferred (The "Soft" UI)
*   **Agent UI Components**: While Vercel's `<Agent />` UI is nice, it is secondary to the backend governance. We can build the UI projection layer *after* the ledger is solid.
*   **Hot-Reloading**: Dynamic agent config updates should be deferred until strict versioning is proven in production.

## Conclusion
This architecture allows Summit to claim **"The World's First SLSA-Level-3 Compliant AI Agent Runtime"**—a massive differentiator against loose, chat-based competitors.
