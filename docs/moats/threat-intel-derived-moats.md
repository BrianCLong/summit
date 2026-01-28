# Threat-Intel Derived Moats (2026-01)

Based on the January 2026 Threat Signal Map, Summit has the opportunity to solidify three structural "moats" that turn compliance and security into competitive advantages.

## Moat 1: Deterministic Agent Provenance (The "Black Box" Killer)

**Addressing:** SIG-2026-004 (Behavioral Obfuscation), SIG-2026-005 (EU AI Act)

* **The Mechanism:** Every agent decision, tool call, and state change is cryptographically signed and appended to the `ProvenanceLedger`. This creates an unbroken chain of custody for "why" an agent acted.
* **Why It's a Moat:** Competitors are building "logs". Summit is building a **Merkle-DAG of Causality**. Replicating this requires rebuilding the orchestration engine (`Maestro`) from the ground up to be ledger-aware.
* **Durable Artifact:** `packages/prov-ledger` (The schema and signing logic).

## Moat 2: Identity Trust Graph (The "Cloud Pivot" Killer)

**Addressing:** SIG-2026-002 (Identity Permutation)

* **The Mechanism:** Summit doesn't just check tokens; it maps the *graph distance* between the acting agent and the resource. If an agent "pivots" (changes roles) too rapidly across the graph, `PolicyEngine` blocks it dynamically.
* **Why It's a Moat:** Identity providers (Okta/Azure AD) see "Who". Summit sees "Who, Where, and How Fast". The underlying `IntelGraph` data structure enables this behavioral analysis.
* **Durable Artifact:** `server/src/policies/graph-policies` (Graph-aware OPA rules).

## Moat 3: Semantic Governance Gates (The "Injection" Killer)

**Addressing:** SIG-2026-003 (RAG Poisoning), SIG-2026-006 (Role Escalation)

* **The Mechanism:** A "Pre-Flight" gate in `Conductor` that runs semantic analysis on the context window *before* the LLM inference. It detects "drift" away from the agent's Constitutional definition.
* **Why It's a Moat:** Most platforms rely on "post-hoc" filtering or simple prompt engineering. Summit integrates this check into the *orchestration loop*, making it impossible to bypass.
* **Durable Artifact:** `server/src/conductor/validation/semantic-validator.ts` (Once implemented).

## Strategic Imperative

We must move these from "features" to "primitives". They should not be optional.
