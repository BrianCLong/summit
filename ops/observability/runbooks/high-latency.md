# High Latency Runbook

## Trigger
This alert is triggered when P95 latency exceeds 500ms for 5 minutes.

## Severity
**Warning** (P2)

## Impact
User experience is degraded.

## Diagnosis
1.  **Identify Slow Endpoint:** Check Grafana to see which endpoints are slow.
2.  **Check Database Performance:** Look for slow queries in Postgres or Neo4j.
3.  **Check Resource Usage:** Is the server CPU or Memory saturated?

## Mitigation
1.  **Cache:** Verify that caching is working.
2.  **Database Index:** Check if a new query is missing an index.

## Escalation
If latency persists for > 1 hour, escalate to the Backend Team.
