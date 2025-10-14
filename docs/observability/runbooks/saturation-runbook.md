# Saturation Breach Runbook

## Trigger
- Alert: `saturation-queue-depth` or `telemetry-pipeline-degraded`
- Condition: Worker queue depth >500 jobs for 15m or CPU >90% for 30m

## Immediate Actions
1. Acknowledge alert and update incident channel with current queue metrics.
2. Confirm synthetic probes remain healthy; otherwise escalate to major incident.

## Diagnostic Steps
1. Review *Infrastructure & Saturation* dashboard for CPU/memory/queue depth trends.
2. Check worker autoscaling events and pending job types.
3. Inspect telemetry collector logs for export failures if `telemetry-pipeline-degraded` fired.
4. Validate upstream rate limiting and ingestion throughput.

## Mitigation Options
- Scale worker replicas by 2x via HPA override.
- Apply queue shedding rule for low-priority jobs.
- Increase OTLP batch timeout if collector saturation observed.

## Escalation
- Page platform infrastructure on-call if saturation persists after scaling.
- Notify product stakeholders if SLA impact >30 minutes expected.

## Verification
- Confirm queue depth <200 and CPU <75% for 1h.
- Close incident with notes on scaling changes and residual risk.

## Post-Incident
- Capture metrics for capacity planning review.
- Validate autoscaling policies and adjust thresholds as needed.
