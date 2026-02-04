# AI Copilot Service Runbook

## Ownership

- **Team**: Platform
- **Service**: AI Copilot (`ai-copilot`)
- **Code Location**: `services/ai-copilot/`

## Dashboards

- Grafana: https://grafana.intelgraph.ai/d/ai-copilot-overview

## SLOs

- Availability: 99.9% (see `slo/ai-copilot.yaml`)
- Latency: 99% ≤ 1s P95 (see `slo/ai-copilot.yaml`)

## Alerts

- `IntelGraphAICopilotErrorRate`
- `IntelGraphAICopilotLatencyP95High`

## Triage Checklist

1. Verify error rate and latency on the Grafana dashboard.
2. Check recent deploys and feature flag changes affecting Copilot.
3. Inspect upstream dependency health (LLM provider, vector store).
4. Review logs for spikes in timeouts or 5xx responses.

## Common Issues

### High Error Rate

**Symptoms**: Error rate > 0.5% for 10+ minutes

**Possible Causes**:

- LLM provider rate limiting or outage
- Vector store connection issues
- Memory pressure causing OOM kills
- Bad deployment with regression

**Resolution**:

1. Check LLM provider status page
2. Verify vector store health: `kubectl get pods -l app=vector-store`
3. Check pod memory usage: `kubectl top pods -l app=ai-copilot`
4. Review recent deploys: `kubectl rollout history deployment/ai-copilot`

### High Latency

**Symptoms**: P95 latency > 1s for 10+ minutes

**Possible Causes**:

- LLM provider slowdown
- Large context windows in requests
- Cold cache after restart
- Network latency to upstream services

**Resolution**:

1. Check LLM provider latency metrics
2. Review request payload sizes in logs
3. Verify cache hit rates
4. Check network connectivity

## Mitigation Steps

- Scale the service or increase worker concurrency:

  ```bash
  kubectl scale deployment/ai-copilot --replicas=6
  ```

- Roll back the latest deploy if regressions correlate with the release:

  ```bash
  kubectl rollout undo deployment/ai-copilot
  ```

- Temporarily switch to a fallback model provider if available:
  ```bash
  kubectl set env deployment/ai-copilot LLM_PROVIDER=fallback
  ```

## Escalation

- Page Platform On-Call via PagerDuty if SLO burn rate persists.
- Notify Security if errors correlate with auth or policy changes.
- Engage LLM provider support if upstream issues confirmed.

## Related Documentation

- [AI Copilot Service README](../services/ai-copilot/README.md)
- [SLO Configuration](../slo/ai-copilot.yaml)
- [Alert Policies](../ALERT_POLICIES.yaml)
