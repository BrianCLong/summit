# Agent Scaling Runbook

## Alerts

| Condition                   | Alert    |
| --------------------------- | -------- |
| coordination overhead spike | warn     |
| token cost spike            | critical |
| agent recursion > threshold | critical |

## Post-Merge Monitoring

A scheduled job monitors the scaling metrics drift, outputting reports to `reports/monitoring/agent-scaling-trend.json`.
Detects token cost drift, coordination overhead drift, and success rate drop.
