# Kill Switches & Rollback at Scale

## Global Kill Switch

- **Mechanism:** Single control flag in config store (`optimization.global_enabled`).
- **Behavior:**
  - When disabled, all loops fail-closed and refuse execution.
  - Budget counters freeze; pending actions are canceled and receipts emitted with reason `global_kill_switch`.
- **Activation Path:** SRE on-call or Governance lead; requires incident ticket reference.

## Per-Loop Kill Switch

- **Mechanism:** `optimization.loops.{loop_id}.enabled` flag plus max change window parameters.
- **Behavior:**
  - Disables scheduling and executes rollback for any in-flight changes where applicable.
  - L-A1/L-B1/L-C1: rollback to `rollback_pointer` in latest receipt and run verification checklist.
  - L-D1: halt advisories and suppress alerts temporarily.

## Rollback Process

1. **Identify rollback target** from last valid receipt (rollback_pointer).
2. **Apply revert** via configuration deployment or policy reversion.
3. **Verify** with post-rollback checks:
   - Metrics return to baseline within defined thresholds (e.g., latency ±2%, error rates ±0.2%).
   - Budgets reconciled and action counters reset.
   - Provenance entry confirming success/failure of rollback.
4. **Communicate** status to incident channel and governance log.

## Verification Tests

- Simulation jobs exercise kill switch toggles and validate fail-closed behavior.
- Rollback drills run monthly; success requires metrics parity and no policy violations.
