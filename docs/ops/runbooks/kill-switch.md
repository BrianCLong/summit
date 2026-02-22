# Kill-Switch Runbook

## Purpose
To enforce disciplined pivots or shutdowns when business viability thresholds are not met, preventing "zombie startup" mode.

## Decision Tree & Thresholds

| Milestone | Metric | Threshold (Fail if <) | Action |
| :--- | :--- | :--- | :--- |
| **Month 1** | LOIs | 2 Signed LOIs | **Yellow Flag**: Enter Crisis Mode. |
| **Month 3** | MRR | $5,000 | **Red Flag**: Pivot required. |
| **Month 6** | MRR | $20,000 | **Kill Product**: Stop all work on current product. |
| **Month 9** | MRR | $50,000 | **Kill Business Unit**: Shut down the business unit. |
| **Month 12** | ARR Run Rate | $1,000,000 ($83k MRR) | **Shutdown**: Company shutdown. |

## Procedures

### Monthly Check
1.  On the 1st of each month (or closest business day), run the checkpoint script:
    ```bash
    npx tsx scripts/execution/checkpoint.ts
    ```
2.  Review the output `artifacts/execution/checkpoint.json`.

### Yellow Flag (Crisis Mode)
*   **Trigger**: Missing Month 1 targets or nearing Month 3 miss.
*   **Action**:
    *   Suspend all non-critical engineering.
    *   All hands on sales/customer discovery.
    *   Daily progress tracking against the specific missing metric.

### Red Flag (Pivot)
*   **Trigger**: Missing Month 3 targets.
*   **Action**:
    *   **Stop Work**: Halt all feature development on the current product.
    *   **Retrospective**: Analyze why it failed (Product/Market Fit? Execution? Sales?).
    *   **Selection**: Select the next product candidate from the portfolio (e.g., switch from `FactFlow` to `FactGov`).
    *   **Reset**: Update `config/execution_governor.yml` to set new active product.
    *   **Restart**: Begin Week 1 for the new product.

### Kill / Shutdown
*   **Trigger**: Missing Month 6/9/12 targets.
*   **Action**:
    *   Execute legal and operational wind-down procedures.
    *   Archive repository.
    *   Notify stakeholders.
