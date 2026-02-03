# Summit Feature Matrix

This matrix defines the core capabilities available across the three Summit product tiers: **SDK**, **Runtime**, and **Harness**. It serves as a guide for selecting the right component for your integration needs.

| Feature | Summit SDK (Framework) | Summit Runtime (Runtime) | Summit Harness (Harness) |
| :--- | :--- | :--- | :--- |
| **Target Audience** | Developers building custom agents. | DevOps & Platform Engineers deploying agents. | End-users & Enterprises needing "Deep Agents". |
| **Memory** | Basic in-memory (short-term). | Durable state (Postgres/Neo4j) + Vector Store. | **Auto-Folding Context** + persistent workspaces. |
| **Skills** | Function calling interfaces. | **Managed Skills** with permission gates. | Pre-installed **Toolchains** (Code, Web, Data). |
| **Subagents** | Manual orchestration logic. | **Durable Delegation** (cross-thread/process). | **Autonomous Planner** spawns/manages sub-agents. |
| **HITL** | Callbacks for approval logic. | **Standardized Interrupts** & API approval flows. | **Interactive UI** for pausing/modifying plans. |
| **Streaming** | Raw token streams. | **Event + State-Diff Streaming** (OTEL/Socket.IO). | **Live Dashboard** with artifact preview. |
| **Policy/OPA** | Configurable middleware (opt-in). | **Enforced Policy Gate** (all actions checked). | **Guardrails** preventing unsafe high-level goals. |
| **Provenance** | Basic logging hooks. | **W3C PROV-JSON** generation for every step. | **Chain of Custody** linking tasks to outcomes. |
| **Tenancy** | Single-tenant / embedded. | **Strict Multi-Tenancy** (Row-level security). | **User/Group Workspaces** with isolated state. |
| **Evidence** | N/A | Audit logs. | **Cryptographic Evidence Bundles** (complete mission logs). |
| **Safety** | Developer responsibility. | **Kill-Switch** & Rate Limiting. | **Emergency Stop** & Budget caps. |

## Legend

*   **SDK:** Building blocks. Flexible but requires manual implementation of safeguards.
*   **Runtime:** The engine. Enforces rules, durability, and compliance.
*   **Harness:** The car. A complete, driven experience with advanced features built on the Runtime.
