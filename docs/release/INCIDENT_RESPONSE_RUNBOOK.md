# Incident Response Runbook

## Classification
- **SEV-1 (Critical):** Core system offline (GraphRAG, Maestro Orchestrator down).
- **SEV-2 (High):** Degraded performance, single subsystem failure.
- **SEV-3 (Low):** UI bugs, non-critical latency.

## Action Steps
1. **Acknowledge:** On-call engineer acknowledges the page within 5 minutes (SEV-1/2).
2. **Investigate:** Check Datadog / OpenTelemetry dashboards (Traces & Metrics).
3. **Mitigate:** Apply hotfix or trigger rollback (see Rollback Runbook).
4. **Communicate:** Update status page and Slack `#incident-response`.
5. **Resolve:** Confirm system stability.
6. **Postmortem:** Schedule and complete PIR within 48 hours.
