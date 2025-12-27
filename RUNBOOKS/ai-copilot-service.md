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

## Mitigation Steps

- Scale the service or increase worker concurrency.
- Roll back the latest deploy if regressions correlate with the release.
- Temporarily switch to a fallback model provider if available.

## Escalation

- Page Platform On-Call via PagerDuty if SLO burn rate persists.
- Notify Security if errors correlate with auth or policy changes.
