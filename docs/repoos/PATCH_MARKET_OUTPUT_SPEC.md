# Patch Market Output Specification

## Purpose
The Patch Market system analyzes pull requests (patches) and prioritizes them based on their economic value to the repository. This document defines the output contract for the Patch Market prioritization operator reports.

## Artifacts

The system produces two artifacts upon evaluation:
1. **JSON Operator Report**: Machine-readable format for downstream automation and historical tracking.
2. **Markdown Operator Report**: Human-readable format for immediate operator review.

Both artifacts are generated deterministically based on the input queue state.

## Output Schema (JSON)

```json
{
  "timestamp": "2023-10-01T12:00:00.000Z",
  "total_recommendations": 1,
  "recommendations": [
    {
      "patch_id": "PR-123",
      "priority_score": 0.85,
      "classification": "critical",
      "evidence_refs": [
        "pr:123",
        "score:architectural_impact=0.90",
        "score:risk_penalty=0.05"
      ],
      "recommended_action": "merge_immediately",
      "next_review_date": "2023-10-02"
    }
  ]
}
```

### Field Definitions

* **`timestamp`** (String): ISO-8601 UTC timestamp of the original queue generation.
* **`total_recommendations`** (Number): Count of recommendations in the report.
* **`recommendations`** (Array): Ordered list of patch evaluations.
  * **`patch_id`** (String): Unique identifier for the patch (e.g., `PR-123`).
  * **`priority_score`** (Number): The computed economic value score, 0.00 to 1.00.
  * **`classification`** (Enum): Priority tier based on the score. One of:
    * `critical` (Score >= 0.75)
    * `high` (Score >= 0.60, < 0.75)
    * `medium` (Score >= 0.45, < 0.60)
    * `low` (Score < 0.45)
  * **`evidence_refs`** (Array of Strings): Identifiers pointing to the evidence factors used to calculate the score. Useful for auditing.
  * **`recommended_action`** (Enum): Action to be taken by the operator or CI/CD.
    * `merge_immediately` (for `critical`)
    * `queue_next_cycle` (for `high`)
    * `standard_review` (for `medium`)
    * `defer_or_reject` (for `low`)
  * **`next_review_date`** (String): Deterministic date in `YYYY-MM-DD` format for when this patch should be re-evaluated if not acted upon.
    * `critical`: +1 day
    * `high`: +2 days
    * `medium`: +7 days
    * `low`: +30 days

## Generation Process

1. Raw queue evaluation is performed, resulting in an intermediate JSON state with raw scores.
2. `services/repoos/patch-market-formatter.mjs` parses the raw state into the operator output format.
3. The format is serialized as JSON and transformed into a Markdown table via `scripts/repoos/patch-market-report.sh`.

## Design Constraints

- **Determinism**: Given the exact same raw input queue JSON and the same generation timestamp, the outputs must be exactly identical byte-for-byte.
- **Independence**: The formatter does not perform network operations. It strictly acts on provided data.
