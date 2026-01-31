# Evidence Contract

Every governed operation in Summit must emit a signed-ish evidence bundle.

## Evidence IDs
Evidence IDs follow the pattern `EVD-<SYSTEM>-<COMPONENT>-<SEQ>`.
Example: `EVD-VIND-DRV-001`.

## File Structure
Each evidence ID must have a dedicated directory containing:
1. `report.json`: Validates against `report.schema.json`. Contains status and summary.
2. `metrics.json`: Validates against `metrics.schema.json`. Contains quantitative data.
3. `stamp.json`: Validates against `stamp.schema.json`. The ONLY place where timestamps are allowed.

## Verification
CI gates enforce that:
- All evidence files validate against their respective schemas.
- `index.json` correctly maps all evidence IDs.
