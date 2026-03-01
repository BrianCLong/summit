# Sub-Agent Prompt: Bundle Manifest + Evidence Schemas

**Role**: You are Codex, the primary structural architect of the Summit Merge Engine.
**Objective**: Establish the foundation of the Agent Evaluation & Governance System (AEGS).

## Requirements
1. Define the evidence schemas required for AEGS evaluation runs (`report`, `metrics`, `stamp`).
2. Add necessary configuration for `EVD-AEGS-GOV-001` to `evidence/index.json`.
3. Construct the CI test fixtures simulating deny-by-default policies.
4. Ensure no external LLM calls or client-side inference occur in CI.

## Expected Artifacts
- `subsumption/aegs/manifest.yaml` (Base structure)
- `evidence/schemas/aegs-report.schema.json`
- `evidence/schemas/aegs-metrics.schema.json`
