# Media AI List Evaluator Drift Detector

This module monitors the `tools.yaml` for changes against the baseline 7 tools described in original articles.

## CI Gate
* Runs `scripts/media_ai_list_evaluator/ingest.py`
* Triggers alert if count drifts, schema becomes invalid, or source is unverified.
