# Runbook: Incident Response - The First 30 Minutes

This runbook is the primary reference for on-call engineers when a production alert is triggered.

## T+0 to T+5: Initial Triaging

1. **Acknowledge**: Respond to the alert in Slack/PagerDuty.
2. **Verify Health**: Check the status of critical endpoints.
   ```bash
   npm run test:smoke
   ```
3. **Check Logs**: Search for "Error" or "Fatal" in the centralized log store.
   ```bash
   # Local log tailing
   tail -f server/server.log | jq
   ```

## T+5 to T+15: Impact Assessment

1. **User Impact**: Is this affecting all tenants or a single tenant?
   * Check `summit_graphql_error_rate` grouped by `tenant_id` in Grafana.
2. **System Health**: Check for resource exhaustion.
   * CPU/Memory spikes in Kubernetes/ECS dashboard.
   * PostgreSQL connection pool utilization (`pg_stat_activity`).

## T+15 to T+30: Containment and Mitigation

1. **Enable Safety Gates**: If the system is unstable, enable Safe Mode to block high-risk paths.
   ```bash
   # Set via environment or Vault
   SAFE_MODE=true
   ```
2. **Global Kill Switch**: If data corruption or unauthorized mutations are occurring, disable all writes.
   ```bash
   KILL_SWITCH_GLOBAL=true
   ```
3. **Rollback**: If the incident started immediately after a deployment, trigger a rollback to the previous stable tag.
   ```bash
   git checkout v5.3.0
   npm run deploy:prod
   ```

## Communication

- **Status Page**: Update the public status page if user impact exceeds 5 minutes.
- **Internal Comms**: Start a Zoom/Slack bridge for engineering coordination.
