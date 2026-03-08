# Agent Scaling Runbook

## Alerts

| Condition                   | Alert    | Resolution                                          |
| --------------------------- | -------- | --------------------------------------------------- |
| coordination overhead spike | warn     | Check `agent-benchmark` logs, optimize agent prompt |
| token cost spike            | critical | Review LLM token limits and tool payloads           |
| agent recursion > threshold | critical | Enforce `maxSteps` strictly in EvaluationRunner     |

## Metrics Dashboard
Review `reports/agent-scaling/metrics.json` to monitor trends.
