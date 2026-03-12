# Agent Ecosystem Report

## Overview
Recent developments in the agent ecosystem highlight key differences across popular frameworks in terms of orchestration, memory handling, error recovery, and enterprise scalability. This report provides a verified assessment of these frameworks to guide our benchmark backlog and Summit Bench expansions.

## Framework Assessments

### AutoGen (Microsoft)
- **Paradigm:** Conversational multi-agent orchestration.
- **Key Capabilities:** Flexible, chat-driven repair and diverse agent topologies.
- **Challenges:** Can become "chat-heavy", leading to higher token consumption and less deterministic control loops for complex state management.
- **Summit Relevance:** Useful for flexible collaboration patterns, but needs strict policy-gating for enterprise use.

### CrewAI
- **Paradigm:** Role-playing and mirroring human team structures.
- **Key Capabilities:** Highly intuitive for defining specialized roles, pragmatic isolation between tasks.
- **Challenges:** May lack the granular state recovery of graph-based approaches.
- **Summit Relevance:** Role-based execution aligns well with specialized micro-agents behind policy gates.

### LangGraph (LangChain)
- **Paradigm:** State-machine/graph-based workflows.
- **Key Capabilities:** Granular control over state, explicit failure encoding (error edges, rollbacks, checkpoints), superior for complex, cyclical agent interactions. Deterministic recovery.
- **Challenges:** Steeper learning curve compared to lightweight SDKs.
- **Summit Relevance:** Closely aligns with Summit's need for deterministic recovery, verifiable planning, and policy-gated control flows.

### OpenAI Agents SDK
- **Paradigm:** Lightweight, code-first orchestration.
- **Key Capabilities:** Core primitives (Agents, Handoffs, Guardrails), excellent tracing and visualization, simple retries on function calls.
- **Challenges:** Lacks built-in, complex rollback semantics found in LangGraph.
- **Summit Relevance:** The emphasis on "Guardrails" and "Handoffs" maps cleanly to Summit's external policy engine and bounded autonomy requirements.

## Proposed Benchmark Expansions

To ensure our agent evaluations reflect 2026 gold standards, we propose expanding Summit Bench with the following dimensions:

1. **State Recovery & Determinism:**
   - *Metric:* Rollback success rate, partial restart determinism.
   - *Case:* Agents must recover from forced tool failures mid-cycle.

2. **Control & Trace Quality:**
   - *Metric:* Invalid command rate, tool misuse rate.
   - *Case:* Agent must complete tasks with friction (e.g., malformed schemas) while maintaining clean execution traces.

3. **Multi-Agent Handoff Reliability:**
   - *Metric:* Context loss across handoffs, adherence to guardrails during transfer.
   - *Case:* Information passing between a perception agent and a planning agent under strict policy constraints.

## Next Steps
- Integrate proposed benchmark dimensions into the `benchmarks/harness/config.yaml` backlog.
- Update `agent-eval-insights.md` with detailed evaluation metrics derived from this report.
