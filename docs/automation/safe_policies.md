# SAFE_AUTOMATION Policy Registry

This document describes the Policy Registry, which serves as the central configuration source for defining when automation actions are permitted to execute without manual intervention.

## Core Concepts

The Policy Registry implements speed with control by linking automated actions to risk assessments and the Governance Council OS.

1.  **AutomationActionClass**: Represents the specific operation to perform (e.g., `ADD_TO_WATCHLIST`).
2.  **RiskLevel**: The severity threshold that must be met to trigger the automation (e.g., `MEDIUM`, `HIGH`).
3.  **GovernanceTier**: The level of authorization required from the Governance OS before execution (e.g., `TIER_1_COUNCIL`, `EXECUTIVE_COUNCIL`).

## Configuration Details

Policies are defined in `config/automation_policies.yaml`.

For an action to be considered eligible for automation, the current context must:
- Have a risk level equal to or greater than the policy's `min_risk_level`.
- Have received an approval from a governance tier equal to or greater than the policy's `required_governance_tier`.

### Example

```yaml
- action_class: RAISE_INTERNAL_CASE
  subject_types: [PERSONA, CAMPAIGN, EVIDENCE]
  min_risk_level: HIGH
  required_governance_tier: TIER_1_COUNCIL
```

This ensures that cases are only automatically raised internally if the risk is assessed as HIGH, and Tier 1 Council has explicitly authorized this workflow.
