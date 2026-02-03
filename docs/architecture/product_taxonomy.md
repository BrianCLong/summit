# Summit Product Taxonomy

This document outlines the high-level architecture and product taxonomy for Summit, adopting a three-layer mental model: **Framework**, **Runtime**, and **Harness**. This structure clarifies the "buy vs. build" decision for enterprise customers and developers.

## 1. The Three Layers

We frame the agent stack as **Framework → Runtime → Harness**.

### 1. Summit SDK (Framework)
*   **Role:** Developer abstractions to build agents fast.
*   **Components:** Tools, structured outputs, policies/middleware, agent loops.
*   **Use Case:** Building custom agents, embedding agentic capabilities into existing applications.
*   **Analogy:** The "React" or "LangChain" of the stack—libraries you import to build your own logic.

### 2. Summit Runtime (Runtime)
*   **Role:** Production infrastructure for long-running, stateful agents.
*   **Components:** Durable execution, state management, streaming, HITL (Human-in-the-Loop), audit logging, provenance tracking.
*   **Use Case:** Running agents in production with enterprise guarantees (reliability, security, compliance).
*   **Key Features:**
    *   **Durable Execution:** Resumable workflows, crash-safe checkpoints.
    *   **Streaming:** Token, event, and state-diff streaming.
    *   **Governance:** Policy enforcement, audit trails.
    *   **Isolation:** Multi-tenant execution environments.

### 3. Summit Harness (Harness)
*   **Role:** Opinionated "batteries included" agent system.
*   **Components:** Planner, task graph/to-do lists, subagents, workspace/filesystem, auto-context engineering.
*   **Use Case:** End-to-end autonomous agent platform for complex, long-running missions. "Deep Agent" style.
*   **Analogy:** The "IDE" or "Operating System" for agents—a complete environment where agents live and work.

## 2. Decision Tree: When to Use What

Use this guide to determine which component meets your needs, with a focus on enterprise requirements.

### Use **Summit SDK** if:
*   You are building a bespoke agent application from scratch.
*   You need to embed agentic features inside an existing product.
*   You want full control over the agent loop and prompt engineering.
*   *Signal:* "I just need a library to call LLMs and manage tools."

### Use **Summit Runtime** if:
*   **Governance & Compliance:** You need policy enforcement (OPA), auditability, and provenance tracking for every action.
*   **Reliability:** You need durable execution where workflows survive server crashes and can be resumed.
*   **Multi-tenancy:** You need strict isolation between different users or tenants.
*   **Human-in-the-Loop:** You require standardized interrupt/approval workflows before sensitive actions.
*   *Signal:* "I need a production-grade backend to run these agents safely."

### Use **Summit Harness** if:
*   **Complex Missions:** You have long-running, multi-step tasks that require planning and breakdown.
*   **Delegation:** You need a main agent that can spawn and manage sub-agents.
*   **Workspace Management:** You need a persistent file system and context management (e.g., "folding" memories).
*   **Toolchains:** You need a pre-integrated suite of tools and skills.
*   *Signal:* "I need a full 'Deep Agent' system that can take a high-level goal and just go do it."
