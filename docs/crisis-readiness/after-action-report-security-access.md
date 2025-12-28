# After-Action Report — CR-SEC-002 (Security & Access)

**Date:** 2025-12-27
**Incident Commander:** Assigned (ICS activated 11:25)
**Severity:** SEV-2

## Summary

An audit-log anomaly suggested credential reuse and possible privilege escalation for `svc-ingest`. Investigation confirmed mismatched IP usage for the same token. We rotated credentials, revoked elevated roles, and froze access changes during verification.

## Timeline (Recorded)

- **11:16** Security Lead detects SIEM alert.
- **11:20** Escalation to IC.
- **11:25** ICS activated (roles assigned).
- **11:31** Credentials rotated.
- **11:38** Elevated role removed.
- **11:45** Governance review sign-off.
- **11:50** Internal update issued.

## Decisions & Rationale

- **Rotate credentials immediately** to reduce exposure risk.
- **Freeze access changes** until audit completed to preserve evidence integrity.

## Evidence Referenced

- Audit event stream in `audit/`.
- Authz gateway incident handlers: `services/authz-gateway/src/incidents.ts`.
- Security incident runbook: `docs/runbooks/security-incident-response.md`.

## What Worked

- SIEM detection within 3 minutes met target.
- Escalation within 6 minutes met target.
- Governance sign-off completed before external communications.

## What Failed

- No automated linkage between audit anomaly and role change alert.
- Token usage analytics not visible in default dashboard.

## Root Cause Analysis (Blameless)

Primary cause was a service account token used by an unintended automation job. Contributing factor: lack of correlation alert between audit anomaly and role changes.

## Action Items

1. **Add correlation alert** between audit anomalies and role changes. **Owner:** Security Lead. **Due:** 2026-01-10.
2. **Update dashboards** to surface token usage by IP. **Owner:** Observability Lead. **Due:** 2026-01-07.
3. **Automate access freeze playbook** entry in incident tooling. **Owner:** Technical Lead. **Due:** 2026-01-10.

## Postmortem Notes

No evidence of data access beyond expected scope. External statement not required; internal briefing delivered to executives.
