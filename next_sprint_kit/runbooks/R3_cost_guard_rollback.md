# R3 Runbook — Cost Guard Rollback & Stabilization

## Purpose
Restore service when cost guard blocks legitimate traffic or destabilizes demos.

## KPIs
- False positive rate <5% after rollback.
- Alert latency <5 minutes for true excursions.
- No more than 2 manual overrides per day post-rollback.

## Steps
1. **Snapshot state:** Export current cost guard policies and decision logs for the last hour.
2. **Switch mode:** Set guard to `advisory` for affected tenants; keep alerts flowing.
3. **Back out thresholds:** Revert to last known good policy bundle stored in Git/tag `cost-guard-r2`.
4. **Flush caches:** Clear rule cache and restart worker to ensure new policies load.
5. **Validate:** Replay last 15 minutes of usage from `demo_data/usage.jsonl` with `--dry-run`; confirm block rate <5% and alerts still fire for injected spikes.
6. **Communicate:** Notify FinOps and Governance channels; record rationale and XAI notes (decision reasons, feature importances if available).
7. **Re-enable enforcement:** Gradually raise severity for single tenant; monitor dashboards for 30 minutes before enabling globally.

## Failure Modes & XAI Notes
- **Persistent false positives:** Capture feature contributions for decisions; consider disabling anomalous feature weights.
- **Missed excursion:** If $/insight exceeds target during advisory mode, raise manual block and open incident; include explanation of missed signals.
- **Ledger mismatch:** Ensure rollback actions emit `cost.guard.rollback` events with hashes for audit alignment.
