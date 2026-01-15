# 2026 Strategic Roadmap: Agentic Infrastructure & Multi-Agent Orchestration

**Timeline:** 60–90 Days (Q1 2026)
**Theme:** "Agents as Infrastructure"
**Driver:** Market shift towards multi-agent orchestration, neutral control planes, and "auto-judging".

## Executive Summary
This roadmap operationalizes the Q1 2026 signal that agentic AI is shifting from "chatbots" to "co-workers" and infrastructure. Summit will pivot to position **Maestro** as a neutral, multi-provider agent control plane and **IntelGraph** as a specialized "deep research" agent platform for high-assurance domains (OSINT, Cyber, Public Sector).

---

## 1. Maestro: The Neutral Agent Control Plane
*Shift from single-agent orchestration to multi-agent "teams" and observability.*

### Epics
*   **`feat(maestro-ui):` Agent Control Plane Dashboard**
    *   **Goal:** A "mission control" for viewing jobs, runs, tool calls, and costs across multiple agents.
    *   **Deliverables:**
        *   `Maestro Dashboard` in `apps/webapp`: Views for "Live Runs", "Agent Topology" (graph view of who called whom), and "Audit Log".
        *   Visualization of agent-to-agent handoffs.
    *   **Repo Map:** `apps/webapp/src/maestro`, `maestro/server`

*   **`feat(maestro-core):` Multi-Agent Orchestration Primitives**
    *   **Goal:** First-class support for "Teams" of role-specialized agents (e.g., Researcher, Critic, Writer).
    *   **Deliverables:**
        *   Define `AgentTeam` schema in `packages/maestro-core`.
        *   Implement "Router" agents that delegate tasks based on intent.
    *   **Repo Map:** `packages/maestro-core`, `maestro/`

*   **`feat(maestro-telemetry):` Cost & Latency Attribution**
    *   **Goal:** Per-agent, per-provider cost accounting to support the "neutral orchestrator" value prop.
    *   **Deliverables:**
        *   Middleware to track token usage and latency per step.
        *   Usage reports in the dashboard.
    *   **Repo Map:** `packages/maestro-sdk`, `maestro/app.py`

## 2. IntelGraph: Deep Research & Narrative Intelligence
*Shift from "search" to "autonomous investigation".*

### Epics
*   **`feat(intelgraph-agent):` Deep Research Agent Prototype**
    *   **Goal:** An agent that performs multi-step OSINT investigations: Search -> Read -> Verify -> Synthesize -> Graph.
    *   **Deliverables:**
        *   `ResearchAgent` class in `intelgraph/agents`.
        *   Recursive "verification loop" (agent checks its own facts).
        *   Output format: Structured Knowledge Graph (Nodes/Edges) + Narrative Report.
    *   **Repo Map:** `intelgraph/core`, `packages/osint-search`

*   **`feat(intelgraph-governance):` Auto-Judging Hooks (Project "Koshchei")**
    *   **Goal:** Every analytic run includes a self-check and risk label.
    *   **Deliverables:**
        *   `GovernanceJudge` agent that critiques outputs for bias, hallucination, or policy violation.
        *   "Confidence Score" attached to every edge/node in the graph.
    *   **Repo Map:** `packages/governance`, `intelgraph/services`

## 3. Summit Core: Infrastructure as Moat
*Shift from model dependence to provider abstraction.*

### Epics
*   **`feat(summit-core):` Universal Model Abstraction Layer**
    *   **Goal:** "Bring Your Own Model" (BYOM) architecture. One API to call OpenAI, Anthropic, Gemini, or local OSS models.
    *   **Deliverables:**
        *   `ModelAdapter` interface in `packages/cloud-abstraction`.
        *   Implement adapters for: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Flash, DeepSeek (OSS).
        *   Configurable routing logic (e.g., "Use cheapest for summarization, smartest for reasoning").
    *   **Repo Map:** `packages/cloud-abstraction`, `packages/ai-ml-suite`

*   **`spec(agent-protocol):` Summit Agent ABI**
    *   **Goal:** A minimal, standard protocol for agent communication (inputs, outputs, tool definitions), compatible with emerging standards (MCP).
    *   **Deliverables:**
        *   `ACTIONABLE_AGENT_PROTOCOL.md` spec definition.
        *   JSON Schema for `AgentManifest` (capabilities, tools, policy).
    *   **Repo Map:** `docs/specs`, `packages/maestro-sdk`

---

## Success Criteria (Q1 Exit)
1.  **Maestro:** Can run a 3-agent "team" (Researcher -> Analyst -> Writer) and visualize the flow in the dashboard.
2.  **IntelGraph:** "Deep Research" agent can produce a verified OSINT report from a vague prompt ("What is the current status of X?") with <10% hallucination rate (measured by auto-judge).
3.  **Infrastructure:** Switch underlying model provider for a live agent without code changes (config only).
