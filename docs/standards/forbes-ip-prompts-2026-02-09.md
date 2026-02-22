# IP Capture Standards (Forbes IP Prompts 2026-02-09)

## Overview
This feature implements the "IP Capture" pipeline based on the Forbes article. It transforms raw experience (markdown) into structured IP assets.

## Inputs
- **Source:** Local filesystem path to a Markdown file (`.md`).
- **Content:** Unstructured text describing experience, methods, or narratives.
- **Metadata (Optional):** Author, domain, date (passed via CLI flags or frontmatter).

## Outputs
All outputs are generated in a deterministic directory.

1.  **Report (`report.json`)**
    - JSON object containing extracted "moments of clarity", "signature methods", and the "IP asset brief".
    - **Schema:**
        ```json
        {
          "version": "1.0.0",
          "moments": [
            { "id": "EVID:...", "text": "...", "offset": 123 }
          ],
          "methods": [
            { "id": "EVID:...", "name": "...", "steps": [...] }
          ],
          "brief": {
            "title": "...",
            "summary": "..."
          }
        }
        ```
    - **Determinism:** No timestamps. IDs are content-hashed.

2.  **Metrics (`metrics.json`)**
    - Operational metadata.
    - Fields: `input_tokens`, `output_tokens`, `redaction_count`, `duration_ms` (excluded from hash).

3.  **Stamp (`stamp.json`)**
    - Provenance data.
    - Fields: `pipeline_version`, `model_id`, `corpus_hash`.
    - **Constraint:** No wall-clock timestamps to ensure deterministic builds.

## Constraints
- **Determinism:** Running the pipeline twice on the same input must yield bitwise identical `report.json`.
- **Evidence:** Every extracted item must link back to source spans via `evidence_id`.
