# Runbook: API Incidents

## 1. Symptoms

- **Alert:** `HighErrorRate` (SEV-1) or `HighLatency` (SEV-2)
- **User Report:** "The dashboard is not loading" or "I get 500 errors when saving".
- **Grafana:** Spike in 5xx status codes or P95 latency line above threshold.

## 2. Immediate Containment

1.  **Acknowledge PagerDuty:** Mark the incident as "Acknowledged" to stop escalation.
2.  **Check Status Page:** Verify if upstream providers (AWS, OpenAI, etc.) are down.
3.  **Enable Rate Limiting (Panic Mode):**
    ```bash
    # If suspecting DDoS or abusive traffic
    ./scripts/incident/containment.sh --action restrict_traffic --severity high
    ```
4.  **Scale Up (If Load Related):**
    ```bash
    # If CPU/Memory is saturated
    kubectl scale deployment/server --replicas=10 -n production
    ```

## 3. Diagnostics

- **Check Logs:**
  ```bash
  # Tail logs for errors
  kubectl logs -l app=server -n production --tail=100 -f | grep "error"
  ```
- **Check Database Connectivity:**
  ```bash
  # Verify DB connection pool status
  ./scripts/diagnose-db.sh
  ```
- **Identify Slow Queries:**
  Check `pg_stat_activity` or the "Slow Queries" dashboard in Grafana.

## 4. Mitigation & Rollback

- **If caused by recent deploy:**
  ```bash
  # Rollback to previous stable version
  ./scripts/deploy/rollback.sh --service server --env production
  ```
- **If caused by bad config:**
  Revert the config change in Git and apply immediately.
- **If caused by feature flag:**
  Disable the feature flag via the admin console or CLI:
  ```bash
  ./scripts/flags.sh disable <feature_name>
  ```

## 5. Escalation

- Escalate to **Engineering Manager** if unresolved after 30 minutes.
- Escalate to **CTO** if data loss is suspected or downtime > 1 hour.

## 6. Post-Incident

1.  Capture evidence: `./scripts/capture-incident-evidence.ts --incident-id <ID>`
2.  Create Postmortem using `docs/ops/POSTMORTEM_TEMPLATE.md`.
