# impl/multimodal

This package houses the multimodal modeling, data, and runtime scaffolding for Summit.

## Contents
- `schemas/`: JSON Schemas for image, document, layout, and UI graph artifacts used across ingestion, training, and retrieval.
- `configs/` (future): model and data configs for the 1.3B multimodal variant, including curriculum weights and tool policies.
- `runtime/` (future): adapters for OCR/table/chart/UI detectors, graph builders, and tool-routing policies.

## Validation
- Schemas are draft-07 compatible and intended for validation in ingestion and experiment pipelines.
- Suggested smoke check: `multimodal-config-smoke` should validate sample payloads against these schemas.

## Integration Notes
- Graph projections align with IntelGraph node/edge expectations to enable retrieval and provenance.
- Security tags are provided for redaction and tenancy-aware governance.
