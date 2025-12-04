# Freedom-to-Operate Notes: Multimodal Frontier v0.1

## Scope
Multimodal document/image/UI understanding with graph projections, telemetry-driven curricula, and tool-native orchestration.

## Known Areas to Monitor
- Existing VLM patents on vision encoders and multimodal prompting (ensure distinctness via graph projection + telemetry loop).
- Document layout analysis (LayoutLM-style) claims—our delta is IntelGraph projection plus tool-call supervision.
- UI automation via LLMs—differentiate through explicit UI graph schema, action safety guardrails, and knowledge traces.
- Tool orchestration patents—mitigate overlap by emphasizing telemetry-adaptive routing and graph-grounded reasoning.

## Defensive Publication Targets
- Minimal graph schemas for documents, charts, and UIs stored in IntelGraph with provenance hashes.
- Telemetry-driven curriculum scheduler that reweights modalities/tasks and tool priors based on production error taxonomy.
- Governance pipeline for redaction-aware multimodal embeddings and tool-call auditability.

## Third-Party Dependencies and Licenses
- Vision/layout encoders (e.g., ViT, LayoutLM) under Apache-2.0/BSD; confirm license compatibility for fine-tuning.
- OCR/table/chart parsers: prefer Apache-2.0/MIT components; track detector versions in metadata.

## Next Actions
- Maintain `ip/prior_art.csv` with VLM, DocQA, ChartQA, and UI agent references plus differentiators.
- Run quarterly FTO reviews as modalities expand (audio/video) and as tool policies evolve.
