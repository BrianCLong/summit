# Scenario Governance

## 1. Cadence
*   **Annual Refresh**: All standard futures (Conservative, Balanced, Aggressive) must be fully refreshed and reviewed annually (Q4).
*   **Quarterly Review**: Review of current trajectory against the "Balanced" forecast.
*   **Ad-Hoc**: Triggered by major external events (e.g., new legislation, competitor moves) or significant internal shifts (e.g., pivot).

## 2. Roles & Responsibilities
*   **Strategy Lead**: Owner of the Scenario definitions and assumptions.
*   **Engineering Lead**: Owner of the Simulation Engine correctness and model accuracy.
*   **Finance Lead**: Owner of the Cost model inputs and validation.
*   **Compliance Officer**: Owner of the Regulatory model constraints.

## 3. Trigger Conditions
Re-running futures is mandatory if:
*   Tenant count deviates > 20% from forecast.
*   New regulations are proposed with > 50% probability of passing.
*   Major architectural change (e.g., V3 platform) is approved.

## 4. Maintenance
*   Models must be back-tested against actuals quarterly to improve accuracy.
*   Deprecated models must be archived but remain accessible for historical audit.
