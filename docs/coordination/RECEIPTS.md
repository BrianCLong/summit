# Coordination Receipts & Provenance

## 1. Coordination Receipts

Every arbitration decision generates a receipt containing:

*   **decisionId**: Unique ID.
*   **intentId**: The ID of the intent proposing the action.
*   **outcome**: 'proceed', 'suppress', or 'modify'.
*   **reason**: The explanation for the decision.
*   **conflictingIntents**: IDs of intents that caused a conflict.

## 2. Traceability

Receipts are stored in an in-memory ledger (with future persistence planned) to allow operators to trace why specific optimizations were applied or blocked.
