# Observability Runbook & Dashboard Guide

## Core Dashboards
- **Golden Signals:** Tracks Latency, Traffic, Errors, and Saturation (USE/RED metrics).
- **Service Mesh Health:** Monitors Istio/Envoy sidecar performance and cross-service traffic.
- **Agent Orchestration:** Tracks agent task completion rates, queue depth, and LLM token usage.

## Alert Definitions
- **High Error Rate:** Triggers if HTTP 5xx errors > 2% for 5 minutes.
- **Latency Spike:** Triggers if P99 latency > 2s for 10 minutes.
- **Queue Backup:** Triggers if unassigned tasks > 1000 for 15 minutes.

## Alert Handoff
- Alerts are routed to PagerDuty.
- Primary on-call receives the initial page.
- Refer to [Incident Response](../runbooks/INCIDENT_RESPONSE.md) for triage steps.
