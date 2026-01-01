# Summit Known Limits

This declaration captures the tested boundaries and explicit non-goals for the platform. Update values as empirical testing advances; keep entries conservative and evidence-backed.

## Capacity & Scale

| Capability              | Tested Limit                     | Evidence/Command                           | Confidence | Notes                                                        |
| ----------------------- | -------------------------------- | ------------------------------------------ | ---------- | ------------------------------------------------------------ |
| Canonical graph size    | Pending deterministic validation | `make canonical-export` + node/edge counts | Medium     | Publish node/edge counts once data integrity run completes.  |
| Ingest throughput       | Pending load test                | `make ingest-loadtest` (or equivalent)     | Medium     | Record sustained ingest rate (records/sec) and error budget. |
| Simulation overlay size | Pending scenario replay          | Overlay apply command                      | Medium     | Ensure overlay does not mutate canonical hash.               |

## Performance

| Area                                  | Observed Metric | Environment                  | Evidence                             |
| ------------------------------------- | --------------- | ---------------------------- | ------------------------------------ |
| Query latency (p50/p95)               | Pending         | Staging with prod-like data  | Capture from APM/trace export.       |
| Build duration (`make release-build`) | Pending         | CI standard runner           | Store timings per run.               |
| Backup/restore time                   | Pending         | Staging backup/restore drill | Record RTO/RPO in RUNBOOKS and here. |

## Reliability & Safety

- **Change control:** `FEATURE_FREEZE=true` required during freeze windows; `breaking` PRs are blocked.
- **Backup/Restore:** Restore must complete without manual intervention; document timing in backup drill output.
- **Determinism:** Canonical graph hash must be stable across identical inputs; overlays must not alter canonical hashes.

## Unsupported / Non-Goals

- Unbounded schema changes during freeze windows.
- Running without PR classification labels.
- Deploying artifacts without recorded hashes and provenance.

## How to Update This File

1. Run the relevant validation (load test, deterministic graph export, backup/restore drill).
2. Capture the command, environment details, and resulting metrics/hashes.
3. Replace the corresponding table rows with measured values and link the evidence (log, artifact, or PR).
4. Keep entries conservative; if confidence is low, note it and schedule a re-test.
