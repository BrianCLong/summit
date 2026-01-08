# High Error / Latency Runbook

**Trigger:**

- `HighErrorRate` alert (> 1% error rate)
- `HighLatency` alert (p95 > 1.5s)
- `HighGraphQLErrorRate` alert

**Impact:**

- User requests failing or timing out.
- Degraded experience for verification partners.

**Immediate Actions:**

1. **Check Dashboard:** View `observability/dashboards/latency-heatmap` to identify affected endpoints.
2. **Throttle Ingest:**
   - If ingest lag is high, pause lower-priority ingest queues.
   - Command: `summitctl queue pause ingest-low-priority`
3. **Scale Workers:**
   - Check HPA status: `kubectl get hpa`
   - Manually scale if maxed out: `kubectl scale deployment/worker --replicas=20`
4. **Degraded Mode:**
   - If DB is overloaded, switch to text-only mode (disable heavy graph traversals).
   - Toggle flag: `summitctl flags set degraded_mode true`
5. **Notify Partners:**
   - Post to Status Page if impact > 5 mins.

**Escalation:**

- If unresolved in 15 mins, page On-Call SRE.
