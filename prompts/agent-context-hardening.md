# Agent Context Hardening Task

Implement and harden the agent-context middleware for Summit with durable persistence, metrics, and guardrails.

## Requirements

- Persist every agent turn in PostgreSQL with full-fidelity content.
- Emit context telemetry metrics for tokens, summaries, costs, and turn counts.
- Enforce token-budgeted masking/summarization strategies with configurable thresholds.
- Integrate guardrails for max turns and max cost with stop reasons surfaced to the LLM orchestrator.
- Update documentation and roadmap evidence to reflect the enhancements.
