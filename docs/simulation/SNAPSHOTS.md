# Snapshotting & Replay

To ensure simulations are reproducible and safe, we rely on **Snapshots**.

## 1. SimulationSnapshot Structure

A snapshot captures a consistent view of the world at `timestamp`.

```typescript
interface SimulationSnapshot {
  timestamp: Date;
  quotas: Record<string, TenantQuota>;
  budgets: Record<string, BudgetStatus>;
  recentUsage: UsageRecord[];
}
```

## 2. Capture Mechanism

1.  **Trigger**: User initiates a simulation session.
2.  **Collection**:
    *   Fetch all active quotas from `QuotaManager`.
    *   Fetch current budget states from `BudgetTracker`.
    *   Query `metrics` or `usage_logs` for the last N records (e.g., 24 hours).
3.  **Freeze**: This object is serialized or held in memory. It is **never** updated.

## 3. Replayability

Because the engine is deterministic (`f(snapshot, params) -> result`), we can "replay" a simulation anytime by:
1.  Loading the archived snapshot.
2.  Re-submitting the same parameters.

This allows us to verify past decisions: "Why did we think -15% budget was safe?" -> "Replay the simulation from last month." -> "Ah, the usage pattern was different then."

## 4. Drift Detection (Future)

We can compare a *prediction* from the past against *actual* reality.
*   **Predicted Spend**: $500
*   **Actual Spend**: $650
*   **Drift**: +$150 (30%)

This feedback loop helps tune the simulation models (e.g., improving the usage multiplier logic).
