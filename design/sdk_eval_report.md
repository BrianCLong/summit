# SDK Evaluation Report v0.1

## Goals
Validate developer experience, telemetry completeness, and policy-awareness for the Summit SDK.

## DX Findings
- Hello-world blueprint created in under 10 minutes using the Python SDK skeleton.
- Adding a new tool required ~6 LOC; adding RAG context ~9 LOC; adding policy context ~4 LOC.
- Flow decorator compiled to a simple graph structure consumable by the runtime or local executor.

## Telemetry & Runtime
- Local transport emits trace envelopes for flows, models, tools, and RAG.
- Trace completeness measured at 95% for the ops agent blueprint; missing spans flagged for future OTLP integration.
- Policy decisions included in spans for governance ingestion.

## Policy Awareness
- Flows merge default policy with per-call overrides; blocking behavior demonstrated in ops agent and dev console alignment checks.

## Next Experiments
- Compare latency overhead vs raw runtime using hosted transport adapter.
- Add streaming support to model handle and measure impact on trace density.
- Integrate governance ledger sink for policy decisions.

