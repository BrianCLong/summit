# NL→Graph Query Copilot Spec

## Goals
Provide a natural language to Cypher preview and sandbox execution path with explainable annotations and guardrails.

## Pipeline
1. NL intent captured with dataset scope, hypothesis tag, and justification.
2. Parser converts NL to Cypher draft; static analyzer checks syntax/semantics and budget; target syntactic validity ≥95% on curated corpus.
3. Preview UI shows NL, generated Cypher, and diff vs last revision; copilot annotates clauses with source intent and policy checks.
4. Sandbox executes with limited dataset and rate limits; results streamed with citations and provenance IDs.
5. User approves or edits before promotion to production graph.

## Safety & Governance
- All executions enforce OPA policies and cost guard budgets; deny reasons surfaced inline.
- Prompt-injection defenses: strip system prompts, constrain tool access, require justification for privileged actions.
- Logging: capture NL input, generated Cypher, decision, latency, model version, and dataset scope to immutable audit.

## Metrics
- Syntactic validity ≥95%; semantic success ≥90% in sandbox acceptance set.
- Median preview latency <500ms; p95 end-to-end <1.5s.
- Red-team prompt-injection escape rate <1% with daily regression.
