# Entity Recognition Explainability

## Overview

Summit's ML engine now exposes explainability signals for entity recognition
predictions. The pipeline layers optional open-source tooling (LIME/SHAP) on top
of deterministic heuristics to guarantee responses across TensorFlow, PyTorch,
and mock environments.

## Python explainability engine

- Entry point: `server/ml/explainability/entity_explainer.py`
- Supports `LimeTextExplainer` (preferred) and `shap.KernelExplainer` when the
  respective libraries are available. Missing dependencies automatically fall
  back to heuristic scoring so the GraphQL contract remains stable.
- CLI helper: `python -m server.ml.explainability.cli` (reads JSON payload on
  stdin and writes JSON output to stdout).
- Works with both TensorFlow and PyTorch models when provided. When no model is
  supplied, a lightweight heuristic classifier is used.

### Example payload

```json
{
  "text": "John Doe met with TechCorp in Seattle.",
  "entities": [
    {"text": "John Doe", "label": "PERSON", "start": 0, "end": 8},
    {"text": "TechCorp", "label": "ORGANIZATION", "start": 18, "end": 26}
  ],
  "options": {"method": "lime", "top_k": 4}
}
```

## GraphQL contract

New query: `explainEntityRecognition(text: String!, method: String, topK: Int)`
returns `EntityRecognitionExplanation` containing:

- `entities`: normalized entity list with offsets.
- `relationships`: relationship predictions reused from extraction.
- `explanations`: per-entity feature weights, context, and natural-language
  summary.
- `usedMethod`: reports whether LIME, SHAP, or the heuristic fallback generated
  the explanation.

## React dashboard integration

`client/src/components/ai/AIAnalysisPanel.jsx` now renders an
"Explainable Entity Highlights" card inside the Entity Processing tab:

- Users select the explainability backend (Auto/LIME/SHAP) and the number of top
  contributing features.
- Results visualize feature importance via chips, include context snippets, and
  show the method + timestamp.

## Testing

- Python unit tests: `pytest server/ml/tests/test_entity_explainer.py`
- Front-end/GraphQL layers reuse existing test harnesses; run `npm test` (root)
  for full coverage.

## Operational notes

- Configure an alternate Python binary by setting `PYTHON_PATH` in the server
  environment.
- When SHAP/LIME are unavailable, the system logs a warning and automatically
  serves heuristic explanations so downstream UX remains responsive.
