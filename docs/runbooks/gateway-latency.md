# Runbook: Gateway P95 Latency Breach

**ID:** GATEWAY_P95_BREACH
**Service:** gateway
**Severity:** high
**Owner:** @sre/observability
**SLO Impact:** web.p95 < 1.5s

---

## 1. Detection

- **Trigger:** P95 latency > 1.5s for 10m.
- **Threshold:** > 1.5s
- **Dashboards:** [Gateway Dashboard](/grafana/d/gateway)
- **Traces:** [Slow Requests](/tempo/search?tags=service=gateway&minDuration=1.5s)

## 2. Triage

- **Impact:** Users experiencing slow page loads. API timeouts.
- **Urgency:** Immediate (High Severity).

## 3. Diagnostics

- **Check CPU/Memory:** Is the gateway under provisioned?
  ```bash
  kubectl top pods -n gateway
  ```
- **Check Downstream:** Are downstream services slow?
  - Check `dependencies` dashboard.

## 4. Autoremediation

- **Script:** `scripts/autoremediate/scale_up_gateway.sh`
- **Action:** Scales up the gateway deployment by 2 replicas.
- **Manual Trigger:**
  ```bash
  ./scripts/autoremediate/scale_up_gateway.sh
  ```

## 5. Mitigation / Manual Steps

1.  Check if scaling up helps: `kubectl scale deploy/gateway --replicas=+2`
2.  If database is the bottleneck (high latency in DB span), check DB stats.
3.  If a specific endpoint is slow, disable non-critical features via Feature Flags.

## 6. Rollback

- If caused by recent deploy:
  ```bash
  helm rollback gateway
  ```

## 7. Verification

- Monitor P95 latency:
  ```promql
  histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{service="gateway"}[5m])) by (le))
  ```
- Should drop below 1.5s.

## 8. Escalation

- **Primary:** @sre/observability
- **Secondary:** @platform/lead
