# After-Action Report — CR-UX-001 (Product & UX Integrity)

**Date:** 2025-12-27
**Incident Commander:** Assigned (ICS activated 10:12)
**Severity:** SEV-2

## Summary

A cached status widget displayed “All Green” despite an API red state during a live demo window. The issue was detected via probe mismatch and customer success escalation. We disabled the widget via feature flag and issued an internal update within 20 minutes.

## Timeline (Recorded)

- **10:03** Monitoring Lead detects probe mismatch.
- **10:07** Escalation to IC.
- **10:12** ICS activated (roles assigned).
- **10:18** Feature flag `statusWidget.enabled=false` applied.
- **10:22** Internal update issued.
- **10:30** External statement drafted (not published; issue resolved).

## Decisions & Rationale

- **Disable status widget** to stop misrepresentation rather than full rollback.
- **Freeze demo narrative updates** to avoid inconsistent messaging.

## Evidence Referenced

- Grafana panel: `observability/grafana/grafana_ga_core_dashboard.json`.
- UI status cache config in `apps/web` (status widget settings).
- Alert record: `ALERT_POLICIES.yaml` (probe definition reference).

## What Worked

- Probe alert correctly detected mismatch.
- Escalation within 9 minutes met target.
- Comms discipline held; no external overclaim.

## What Failed

- Cache TTL misconfiguration not caught in pre-demo checks.
- Demo checklist lacked UI-state verification step.

## Root Cause Analysis (Blameless)

Primary cause was stale cache TTL configuration. Contributing factor: demo readiness checklist omitted cross-check between UI and API health.

## Action Items

1. **Add demo readiness step** to validate UI vs API status. **Owner:** Comms Lead. **Due:** 2025-12-31.
2. **Add config lint** to flag cache TTL > 5 minutes. **Owner:** Technical Lead. **Due:** 2026-01-05.
3. **Add UI probe** to monitor status widget freshness. **Owner:** Monitoring Lead. **Due:** 2026-01-05.

## Postmortem Notes

No customer data impact. Narrative integrity preserved by disabling the widget quickly.
