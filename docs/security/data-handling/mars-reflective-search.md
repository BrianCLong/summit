# Data Handling for MARS Reflective Search

## Classification
- **Inputs**: Prompts, code diffs, metrics.
- **Outputs**: plan, ledger, lessons, metrics, stamp.

## Redaction
- All reflective lessons must pass through the redaction layer (`summit/mars/redact.py`).
- PII, IP addresses, and API keys are strictly forbidden in machine-verifiable artifacts.

## Retention
- Artifacts are stored in `artifacts/<EVIDENCE_ID>/`.
- Retention follows the standard Summit policy for evidence bundles.
