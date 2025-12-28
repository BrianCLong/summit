# After-Action Report — CR-REL-003 (Reliability & Availability)

**Date:** 2025-12-27
**Incident Commander:** Assigned (ICS activated 13:14)
**Severity:** SEV-2

## Summary

Core dashboard experienced elevated error rates due to cascading API timeouts. SRE detected SLO breach, safe mode was enabled, and non-essential background jobs were paused to stabilize.

## Timeline (Recorded)

- **13:06** SRE detects SLO alert (availability drop).
- **13:10** Escalation to IC.
- **13:14** ICS activated.
- **13:18** Safe mode enabled.
- **13:23** Background batch jobs paused.
- **13:35** Error rates stabilized.
- **13:45** Internal update issued.

## Decisions & Rationale

- **Enable safe mode** to preserve core flows over optional features.
- **Pause batch jobs** to reduce load during mitigation.

## Evidence Referenced

- SLO config: `slo/slo-config.yaml`.
- Observability dashboard: `grafana_ga_core_dashboard.json`.
- Incident handler: `server/src/http/incident.ts`.

## What Worked

- Recognition and escalation within target.
- Safe mode reduced error rate quickly.
- Comms cadence maintained during recovery.

## What Failed

- No automated backpressure signaling from API to web app.
- Batch job pause was manual and delayed.

## Root Cause Analysis (Blameless)

Primary cause was API latency spike from concurrent heavy queries. Contributing factors: lack of automatic backpressure and manual batch job pausing.

## Action Items

1. **Implement API backpressure signal** to UI for degraded mode. **Owner:** Technical Lead. **Due:** 2026-01-15.
2. **Automate batch job pause** on SLO breach. **Owner:** SRE Lead. **Due:** 2026-01-12.
3. **Add load test scenario** for concurrent query spikes. **Owner:** QA Lead. **Due:** 2026-01-20.

## Postmortem Notes

No data integrity issues observed. Customer impact lasted ~25 minutes during simulation.
