# Summit Sync Acceptance Criteria (MVP)

A run passes only if all criteria below are true.

- Gate A (Parity): per table/label row counts and key sets match within configured drift (`PARITY_DRIFT_THRESHOLD`, default `0.0`).
- Gate B (FK to Edge Fidelity): every Postgres FK row maps to exactly one graph edge (no missing, duplicate, or orphan edges).
- Gate C (Transaction Alignment): every applied graph mutation carries `source_system`, `db_name`, `table`, `lsn`, `txid`, `commit_ts`, `op_type`, `actor`, `checksum` and has matching OpenLineage run-id coverage.
- Gate D (Freshness): `source_max_commit_ts - graph_max_commit_ts <= FRESHNESS_SLO_SEC`.
- Reconciliation convergence: `MISMATCH_RATE < 0.01%` after automatic repair.
- OpenLineage lifecycle events emitted: `START` and `COMPLETE` for ingestion and reconciliation phases, plus `COMPLETE` per mutation activity.
- Metrics exposed: `summit_mismatch_total`, `summit_reconcile_latency_ms`, `summit_openlineage_success_total`, `summit_gate_a_pass`, `summit_gate_b_pass`, `summit_gate_c_pass`, `summit_gate_d_pass`.
- Canary scope: `public` schema for 24h before wider rollout.
