# ADR 0002: Agentic Runbooks as First‑Class Workflows
- **Decision:** Define YAML DAGs executed by a lightweight orchestrator; every step logs inputs/outputs to provenance.
- **Rationale:** Deterministic, auditable investigations that blend symbolic queries and model calls.
- **Alternatives:** Pure LLM agents (opaque), BPMN (heavy).