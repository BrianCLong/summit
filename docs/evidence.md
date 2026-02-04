# Summit Evidence System

## Overview
This system enforces evidence schemas for all artifacts (Report, Metrics, Stamp).

## Usage

### 1. Register Evidence ID
Add your evidence ID (e.g., `EVD-PROJECT-TYPE-001`) to `evidence/index.json`.
The structure is:
```json
{
  "items": {
    "EVD-ID": {
      "report": "path/to/report.json",
      "metrics": "path/to/metrics.json",
      "stamp": "path/to/stamp.json"
    }
  }
}
```

### 2. Create Artifacts
Ensure your artifacts match the schemas in `evidence/schemas/`.

*   **Report**: `evidence_id`, `item` (source/ref), `summary`, `artifacts` list.
*   **Metrics**: `evidence_id`, `metrics` dictionary.
*   **Stamp**: `evidence_id`, `created_at`.

### 3. Validate
Run the validator locally:
```bash
python -m summit.evidence.validate
```

## CI Enforcement
The CI script `ci/check_evidence.sh` runs the validator.
It is disabled by default. Enable it by setting `SUMMIT_EVIDENCE_ENFORCE=1`.
