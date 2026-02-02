# Prompt: CogRes Evidence PR1 Scaffold

Create or update the evidence scaffolding needed for the Cognitive Resilience (CogRes) foundation
work. Focus on deterministic schema alignment, validator entrypoints, and roadmap telemetry updates.

## Requirements

- Update evidence schemas to support the CogRes report/metrics/stamp/index shapes while
  preserving legacy compatibility.
- Add a deterministic validator entrypoint under `tools/evidence/`.
- Update `docs/roadmap/STATUS.json` for roadmap telemetry compliance.
- Keep changes additive and low-risk; do not introduce runtime behavior changes.

## Deliverables

- Evidence schemas updated for compatibility.
- Deterministic evidence bundle validator.
- Roadmap status update entry.
