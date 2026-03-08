# Framework Risk Detection Runbook

## Overview
The Framework Risk module evaluates strategic dependency risks associated with framework usage (currently focused on Next.js).

## Configuration & Tuning
- **Feature Flag**: Set `FRAMEWORK_RISK_ENABLED=true` to enforce CI failures. Default is `false` (warn-only).
- **Thresholds**: Modifiable in the CI workflow configuration. Default failure threshold is `risk_score > 0.75`.

## Disabling the Gate
If the gate is incorrectly blocking a critical release:
1. Ensure you have approval from the security/architecture team.
2. Set `FRAMEWORK_RISK_ENABLED=false` in the repository secrets/variables or workflow inputs.

## Alert Conditions
- Drift > 10% week-over-week triggers an `infrastructure-drift` alert.
- Consistently failing CI runs indicate either a valid strategic risk threshold breach or a misconfigured heuristic model.
