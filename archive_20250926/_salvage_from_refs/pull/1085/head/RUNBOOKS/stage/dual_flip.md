## Plan
- Stage runs active/active in ${region_primary} & ${region_secondary}
- STREAM_BACKEND=dual (Redis/Kafka or Kafka/Kafka if already cut over)
- KMS alias present in both regions: alias/conductor/stage/mrk

## Steps
1) Enable dual-region traffic:
   - Route 53: weighted A/AAAA 50/50 to both ALBs.
2) Verify crypto parity:
   - Write 100 test envelopes per tenant; read from both regions; expect 100/100 OK.
3) Chaos (per 15m window):
   - Scale worker-graph-ops in region A to 0 → expect admits/degrades adjust, SLO burn < 1.
   - Disable KMS permissions for app role in region B (simulate grant loss) → decrypt must still succeed via region A alias.
4) Failover:
   - Shift weights 0/100 to region B for 15m; ensure anchors + rewards continue; then 50/50 restore.

## Rollback
- Route53 weights back to healthy region; re-enable grants; verify dashboards green.
