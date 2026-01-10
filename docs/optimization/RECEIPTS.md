# Optimization Loop Receipts & Isolation

Receipts provide immutable provenance for every autonomous optimization action. No action is considered valid unless a receipt is emitted and recorded.

## Receipt Schema (required fields)

- **loop_id**: L-A1, L-B1, L-C1, or L-D1.
- **mode**: advisory | active.
- **trigger_signal**: name + value (e.g., `token_avg_delta=-12%`, `p95_latency=410ms`).
- **decision_rationale**: summary of policy evaluation, budgets, and simulation result.
- **proposed_action**: parameter change or advisory note.
- **expected_outcome**: measurable target (e.g., `tokens -10%`, `error_rate -0.3%`).
- **observed_outcome**: captured after execution window with time bounds.
- **budget_debit**: cost attributed to the action.
- **policy_snapshot**: policy bundle hash and decision result.
- **budget_snapshot**: remaining per-loop and global budget at execution time.
- **receipt_id**: immutable identifier for cross-referencing in provenance ledger.
- **approvals**: human approvals or policy grants used.
- **rollback_pointer**: config hash or policy version to revert to if rollback is triggered.

## Storage & Provenance

- Receipts are written to the provenance ledger with append-only semantics.
- Each receipt links to the simulation artifacts and validation tests executed.
- Receipts must be queryable by loop_id and time window for audit.

## Isolation Guarantees

- Receipts reference only the loop’s scoped resources; any attempt to modify another loop’s parameters is denied and logged.
- Conflict policy: if multiple loops propose changes on overlapping resources, actions are serialized and require human arbitration; receipts document the block.

## Receipt Examples

- **L-A1 active:** Triggered by token overhead >5%; action swaps to compressed template; expected token reduction 12%; rollback pointer to previous template hash; observed outcome captured after 500 requests.
- **L-D1 advisory:** Triggered by unused privilege rate >20%; action emits least-privilege recommendations; no automatic changes; observed outcome is human acknowledgment/triage.
