# Prompt: GDELT GKG Narrative Signal Architecture (Summit)

## Objective

Produce a Summit-style, production-ready architecture document that defines the end-to-end
pipeline for turning GDELT GKG data into narrative signals, including BigQuery slicing,
feature enrichment, graph construction, embeddings, alerting, and agent-facing retrieval.

## Requirements

- Keep BigQuery as the primary compute surface; emit only compact features downstream.
- Provide a concrete slice model and batch schema.
- Include a diagram that shows BQ -> worker -> stores -> agent surface.
- Define graph nodes/edges and determinism constraints.
- Specify alert schema and minimal first slice to deploy.
- Include MAESTRO security alignment (layers/threats/mitigations).
- Reference Summit readiness constraints and governance controls.

## Outputs

- `docs/architecture/gdelt-gkg-narrative-signal.md`
- Update `docs/roadmap/STATUS.json` with an in-progress initiative for this work.
