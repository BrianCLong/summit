# Connector Rate Limit Storm - Runbook

For incidents where upstream connectors return widespread 429s or hard quotas are exceeded.

## Detection

- [ ] Alert: Connector 429 rate >5% for 10 minutes across >2 tenants.
- [ ] Alert: Retry queue depth > SLO or exponential backoff saturating workers.
- [ ] Partner status page indicates throttling.

## Immediate Actions (10 minutes)

- [ ] Activate incident channel; notify partner liaison.
- [ ] Halt new connector enablements and bulk backfills.
- [ ] Enable enhanced logging for connector responses (without secrets).

## Diagnostics

1. **Scope of impact**
   - Command: `connectorctl stats --window 10m --group by=provider`
   - Expected: Identify affected providers; note tenants impacted.
2. **Retry queue health**
   - Command: `kubectl -n connectors get pods -l app=connector-worker`
   - Expected: Pods Running; if `CrashLoopBackOff`, capture logs with `kubectl logs`.
3. **Backoff behavior**
   - Command: `connectorctl retries --provider <provider> --limit 20`
   - Expected: Backoff intervals increasing; no tight retry loops.
4. **Quota remaining (if API exposed)**
   - Command: `curl -H "Authorization: Bearer $PARTNER_TOKEN" $PARTNER_QUOTA_ENDPOINT`
   - Expected: Quota remaining >0; if zero, plan cooldown.

## Mitigations

- [ ] Apply adaptive throttling:
  - Command: `connectorctl throttle --provider <provider> --rate 50% --ttl 20m`
  - Expected: Reduced call rate; 429s plateau or decline.
- [ ] Prioritize critical tenants:
  - Command: `connectorctl priority set --tenant <id> --tier critical`
  - Expected: Critical tenants maintain reduced-but-operational throughput.
- [ ] Pause non-critical jobs:
  - Command: `connectorctl pause --provider <provider> --segment non_critical`
  - Expected: Queue depth stabilizes; retries continue with backoff.

## Recovery Verification

- [ ] 429 rate <1% for 15 minutes.
- [ ] Retry queue depth decreasing; no tight loops.
- [ ] Partner confirms throttling window cleared.

## Communication

- [ ] Share status with customers affected and ETA to full throughput.
- [ ] Document throttling settings applied and schedule cleanup to revert.
