# Evidence Validation Scripts

This directory contains scripts for validating Summit evidence objects for schema compliance, integrity, and completeness.

## Scripts

### `validate_evidence.py`

The primary validation script that performs the following checks:

1.  **Schema Compliance**: Verifies that evidence objects (usually `report.json` files) match the defined JSON schema.
2.  **Confidence Bounds Checking**: Ensures that all confidence scores are within the range `[0, 1]`.
3.  **Cross-reference Integrity**: Verifies that any cited `evidence_id` exists within the analyzed evidence set.
4.  **Evidence Chain Completeness**: Checks for "dead ends" in the citation chain where an evidence object neither has further citations nor is marked as a primary source.
5.  **Duplicate Evidence Detection**: Detects evidence objects with identical content (excluding the `evidence_id`).

#### Usage

```bash
python3 scripts/validation/validate_evidence.py --dir <evidence_directory> --output <report_path>
```

**Arguments:**

*   `--dir`: The root directory to search for evidence (default: `evidence`).
*   `--schema`: Path to the evidence JSON schema (default: `scripts/schemas/summit_evidence.schema.json`).
*   `--output`: Path to save the structured validation report (default: `validation_report.json`).

## Schemas

The validation logic relies on the schemas defined in `scripts/schemas/`:

*   `summit_evidence.schema.json`: Defines the expected structure of a Summit evidence object.
*   `validation_report.schema.json`: Defines the structure of the validation report output.

## Validation Report Format

The output is a JSON file containing:

*   `timestamp`: When the validation was run.
*   `overall_status`: `PASS`, `FAIL`, or `WARNING`.
*   `summary`: Aggregated counts of checked, passed, and failed items.
*   `details`: Per-evidence breakdown of check results, errors, and warnings.

Example:

```json
{
  "timestamp": "2026-03-11T12:00:00Z",
  "overall_status": "FAIL",
  "summary": {
    "total_checked": 100,
    "total_passed": 95,
    "total_failed": 5
  },
  "details": [
    {
      "evidence_id": "EVD-SAMPLE-001",
      "status": "FAIL",
      "checks": {
        "schema_compliance": false,
        "cross_reference": true,
        ...
      },
      "errors": ["Missing required field: item_slug"]
    }
  ]
}
```
