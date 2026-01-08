# Optimization Receipts & Explainability

This document describes the structure of "optimization receipts"—the auditable records of each automated action—and the corresponding explainability views that provide insight into the system's decision-making process.

## 1. Optimization Receipts

Each time the system takes an automated action, it generates a receipt with the following information:

- **Receipt ID:** A unique identifier for the action.
- **Timestamp:** The time the action was taken.
- **Optimization Loop:** The name of the optimization loop that triggered the action.
- **Trigger Signal:** The specific metric or event that initiated the optimization.
  - _Example: "P99 latency for `/api/v1/search` exceeded 500ms for 5 consecutive minutes."_
- **Decision Rationale:** A human-readable explanation of why the action was taken, including the data and confidence scores used.
  - _Example: "Historical data suggests that increasing the cache TTL for this endpoint from 60s to 300s reduces P99 latency by 40% with a 98% confidence score."_
- **Action Taken:** A description of the change that was made.
  - _Example: "Set `CACHE_TTL_SECONDS` for `/api/v1/search` to 300."_
- **Expected Outcome:** The predicted impact of the action.
  - _Example: "P99 latency for `/api/v1/search` is expected to decrease to ~300ms within 15 minutes."_
- **Actual Outcome:** The measured impact of the action, populated after a predefined observation period.
  - _Example: "P99 latency for `/api/v1/search` decreased to 280ms after 15 minutes."_
- **Rollback Plan:** A link to the procedure for reversing the action.

## 2. Explainability Views

To ensure transparency, the system will provide views that allow users to understand the "why" behind each optimization. These views will answer the following questions:

- **"Why did this change happen?"**
  - This view will display the full optimization receipt, providing a clear audit trail.
- **"What data was used to make this decision?"**
  - This view will provide access to the time-series data, logs, and other evidence that informed the decision.
- **"What would have happened if no action was taken?"**
  - This view will show a projection of the trigger metric based on a "no-action" baseline, allowing for a clear comparison of the optimization's impact.
