# MemAlign Operations Runbook

## Overview
MemAlign allows dynamic alignment of LLM judges using human feedback.

## Enabling MemAlign
1.  Ensure `JUDGE_MEMALIGN_ENABLED` feature flag is ON.
2.  Verify valid memory stores exist in `data/memalign/` or configured path.

## Rollback
If agreement drops or latency spikes:
1.  Disable feature flag `JUDGE_MEMALIGN_ENABLED=false`.
2.  Revert to baseline judge behavior.
3.  Investigate `metrics.json` and `memalign-drift.json`.

## Drift Alerts
*   **Trigger**: Agreement drops by >5% vs baseline.
*   **Action**:
    1. Check recent feedback ingestion batches.
    2. Run `judge:align` with clean feedback.
    3. Prune bad episodic examples via CLI (TBD).

## Debugging
*   Check `report.json` for retrieval context.
*   Verify evidence IDs in `stamp.json`.
