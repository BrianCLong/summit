# Runbook: {{SERVICE_NAME}}

## Service Overview
{{SERVICE_NAME}} is a microservice generated via the Golden Path scaffold.

## On-Call
- **Team**: Platform Engineering
- **Slack**: #platform-oncall

## SLOs
- **Availability**: 99.9%
- **Latency**: p95 < 500ms

## Common Incidents

### High Error Rate
1. Check logs: `kubectl logs -l app={{SERVICE_NAME}}`
2. Check dependencies (DB, downstream).

### High Latency
1. Check CPU/Memory usage.
2. Check tracing.
