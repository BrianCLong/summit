# Ingestion Pipeline Stuck - Runbook

High-priority playbook for when ingestion jobs stop progressing or the backlog grows unexpectedly.

## Detection

- [ ] Alert: `ingestion_backlog_size` > SLO for 5m.
- [ ] Alert: `ingestion_lag_seconds` rising for 10m.
- [ ] Synthetic probe for `/health/ingest` failing.
- [ ] Kafka consumer lag on ingestion topics increasing.

## Immediate Actions (15 minutes)

- [ ] Declare incident channel, assign incident commander and scribe.
- [ ] Freeze new connector rollouts and replay jobs.
- [ ] Capture point-in-time metrics and logs for evidence.

## Diagnostics

1. **Backlog + lag**
   - Command: `kubectl -n ingest exec deploy/ingest-worker -- ingestionctl backlog`
   - Expected: JSON with `pending` and `inflight` counts; verify they change over 2–3 polls.
2. **Worker health**
   - Command: `kubectl -n ingest get pods -l app=ingest-worker -o wide`
   - Expected: All pods `Running`; restarts <3. If `CrashLoopBackOff`, capture `kubectl logs`.
3. **Queue pressure**
   - Command: `kafka-consumer-groups --bootstrap-server $BOOTSTRAP --describe --group ingest-workers`
   - Expected: `LAG` stable or decreasing; if increasing rapidly, trigger surge plan.
4. **Stuck batches**
   - Command: `ingestionctl list --status stuck --limit 20`
   - Expected: Empty list. Any stuck batches: note IDs for replay.

## Mitigations

- [ ] Scale workers temporarily:
  - Command: `kubectl -n ingest scale deploy/ingest-worker --replicas=+3`
  - Expected: New pods scheduled within 2 minutes; backlog starts draining.
- [ ] Unstick batches:
  - Command: `ingestionctl replay --batch <batch-id>`
  - Expected: Batch status moves from `stuck` → `running` within 1–2 minutes.
- [ ] Clear poison messages (if DLQ > SLO):
  - Command: `kafka-topics --delete --topic ingest-dlq--dry-run`
  - Expected: No destructive actions unless approved; document DLQ volume and sample errors.

## Recovery Verification

- [ ] Backlog returning to baseline; `lag_seconds` flattening.
- [ ] New ingestion completes within SLA.
- [ ] DLQ volume stable; no repeating poison patterns.
- [ ] Post-incident tasks created for root cause fix.

## Communication

- [ ] Update incident channel every 15 minutes with backlog trend and ETA to green.
- [ ] Record affected tenants, data sources, and time window for later audit.
