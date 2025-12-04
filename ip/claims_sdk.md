# Candidate Patent Claims: Summit SDK

## Independent Claims
1. **Graph-based LLM application framework**: Defining applications as graphs of model invocations, tools, retrieval steps, and governance nodes compiled into an execution DAG that is shared across training, serving, and observability pipelines.
2. **Policy-aware SDK for LLM agents**: Providing SDK entry points where policy/governance configurations are first-class inputs, automatically enforced during execution and traced for audit.

## Dependent Claim Directions
- Telemetry-by-design: automatic emission of structured traces for every primitive without developer instrumentation.
- Composable blueprint graphs: reusable graph templates with parameterized policy overlays.
- Per-tenant configuration layers controlling models, tools, and governance rules.
- Consistency with SRE/gov schemas via typed trace envelopes.
- Migration-safe model contracts across sizes/backends.
- Pluggable RAG/memory components with consistent context schema.
- Safety/oversight hooks toggled at flow creation.
- CLI/IDE integration for codegen from blueprints and trace inspection.

