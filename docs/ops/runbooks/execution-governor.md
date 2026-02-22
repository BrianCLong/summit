# Execution Governor Runbook

## How to Set Active Product
1.  Open `config/execution_governor.yml`.
2.  Change `active_product` value (e.g., `factflow` to `factgov`).
3.  Update `frozen_products` list to exclude the new active product and include the old one.
4.  Submit a PR with the config change.
5.  **Note**: This should only happen after a "Pivot" decision or successful completion of the current product milestones.

## How to Run Weekly Scorecard
1.  Ensure you have the latest sales and hiring data in `data/execution/pipeline_stub.json`.
2.  Run the scorecard script:
    ```bash
    npx tsx scripts/execution/scorecard.ts --week-of YYYY-MM-DD
    ```
3.  Verify the output in `artifacts/execution/scorecard.json`.
4.  Commit the generated scorecard and the updated data stub.

## How to Interpret Checkpoint Failures
When `scripts/execution/checkpoint.ts` runs (triggered manually or by CI):
1.  It reads the latest scorecard and the `config/execution_governor.yml`.
2.  It generates `artifacts/execution/checkpoint.json`.
3.  If a failure is detected (e.g., "Month 3 Revenue < $5k"):
    *   **ACTION REQUIRED**: The script will output a warning.
    *   **Yellow Flag**: Initiate "Crisis Mode". Schedule a war room to unblock sales/shipping.
    *   **Red Flag**: Prepare Pivot/Kill analysis. Stop engineering on features; focus on validity testing.

## Crisis Mode Playbook
Triggered when 2 consecutive weeks fail ship/sell targets.
1.  **Freeze all new features**.
2.  **Daily Standups** focused solely on the blocker (e.g., "Why no LOIs?").
3.  **Customer Interviews**: Minimum 5 interviews/week to validate the problem/solution fit.
4.  **Code Red**: If not resolved in 2 weeks, escalate to Kill-Switch decision.
