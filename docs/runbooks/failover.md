# Regional Failover Runbook

**Trigger:** Monitor `Global Availability` drops below 99% for >5m, or Cloud Provider status page indicates region failure.

## 1. Assessment
- Check PagerDuty for "Region Down" alerts.
- Check `status.aws.amazon.com` or equivalent.
- Confirm with SRE lead (@oncall).

## 2. Decision
- If outage is confirmed and expected >30m, initiate failover.

## 3. Execution (The "Big Red Button")
1. **Stop Traffic to Primary:**
   ```bash
   # Update DNS weighted routing to 0 for primary
   ./scripts/dr/update-dns-weight.sh primary 0
   ```
2. **Promote Secondary DB:**
   - Log into Secondary Region console.
   - Select RDS Read Replica -> Actions -> Promote.
   - Wait for "Available" status (~5-10m).
3. **Scale Up Secondary Compute:**
   ```bash
   kubectl scale deploy --all --replicas=10 -n production --context=secondary
   ```
4. **Route Traffic:**
   ```bash
   ./scripts/dr/update-dns-weight.sh secondary 100
   ```

## 4. Verification
- Run `k6` smoke test against secondary endpoint.
- Verify `POST /api/health` returns 200.

## 5. Failback (Post-Incident)
- Do NOT auto-failback. Requires data sync (DMS) from Secondary -> Primary before switch.
