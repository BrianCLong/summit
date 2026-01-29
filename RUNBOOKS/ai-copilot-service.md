# AI Copilot Service Runbook

## Ownership

| Role    | Team/Contact                     |
| ------- | -------------------------------- |
| Primary | team-platform                    |
| Pager   | https://pagerduty.com/ai-copilot |
| Slack   | #ai-copilot-oncall               |

## SLOs

| SLO           | Target | Window  |
| ------------- | ------ | ------- |
| Availability  | 99.9%  | 30 days |
| Latency (P95) | < 1s   | 30 days |

See `slo/ai-copilot.yaml` for full SLO definitions.

## Alerts

| Alert                         | Severity | Description                            |
| ----------------------------- | -------- | -------------------------------------- |
| AiCopilotAvailabilityBurnRate | critical | Error rate exceeds burn rate threshold |
| AiCopilotLatencyBurnRate      | warning  | Latency exceeds P95 targets            |

Alert policies defined in `ALERT_POLICIES.yaml`.

## Triage Checklist

1. Check Grafana dashboard for error rate and latency spikes
2. Review recent deployments in ArgoCD
3. Check upstream dependencies (LLM provider, vector DB)
4. Verify rate limiting and circuit breakers
5. Check Kubernetes pod health and resource utilization

## Mitigation Steps

### High Error Rate

1. Check LLM provider status page for outages
2. Verify API key validity and quota
3. Review error logs for specific failure modes
4. Consider enabling fallback model if primary is degraded

### High Latency

1. Check request queue depth
2. Verify vector DB response times
3. Review prompt complexity and token counts
4. Scale horizontally if load-related

### Service Unavailable

1. Check pod status: `kubectl get pods -l app=ai-copilot`
2. Review pod logs: `kubectl logs -l app=ai-copilot --tail=100`
3. Check resource limits and OOM events
4. Verify network connectivity to dependencies

## Escalation

| Level | Condition                              | Contact             |
| ----- | -------------------------------------- | ------------------- |
| L1    | SLO at risk (< 30min budget remaining) | On-call engineer    |
| L2    | SLO breached or prolonged incident     | Team lead           |
| L3    | Customer impact or data integrity risk | Engineering manager |

## References

- Service code: `server/src/ai-copilot/`
- SLO config: `slo/ai-copilot.yaml`
- Alert policies: `ALERT_POLICIES.yaml`
- Metrics: `server/src/monitoring/metrics.ts`
