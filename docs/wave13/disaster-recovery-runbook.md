# Disaster Recovery Runbook

## Incident Declaration

- Trigger: regional outage, data loss event, or RPO breach alarm.
- Declare incident in PagerDuty + `#dr` Slack with incident commander assigned.

## Failover & Restore Steps

1. **Assess**: identify impacted tiers and latest successful backup timestamps.
2. **Failover**: promote standby (hot) for Tier 0; route traffic via DNS/ingress update.
3. **Restore**:
   - Postgres: restore from latest base backup + WAL; verify checksums.
   - Neo4j: apply snapshot; run integrity check on indexes.
   - File/object stores: restore via S3 versioned buckets.
4. **Validate**: execute synthetic script covering login, search query, ingest flow, and privacy budget decrement.
5. **Observe**: monitor metrics for 30 minutes; ensure RTO met.
6. **Communicate**: status updates every 15 minutes; final report stored in `drills/reports/`.

## Automated Drill

- Scheduled weekly in staging; uses latest backups, measures restore duration, and posts report with pass/fail on validation checklist.

## Checklist

- [ ] RPO/RTO confirmed per tier
- [ ] Backups verified (checksum + decrypt)
- [ ] Access controls intact post-restore
- [ ] Audit/log pipelines functioning
- [ ] Post-incident review created
