# Tabletop Drill Checklist

Use this checklist to rehearse incident response and validate readiness. Schedule quarterly drills and rotate facilitators.

## Pre-Drill Setup

- Choose scenario aligned to top risks (e.g., auth outage, data integrity, supply-chain compromise).
- Define success criteria (detection time, comms cadence, handoff quality).
- Assign roles: Incident Commander, Scribe, Comms Lead, Domain Leads, Observer.
- Prepare artifacts: runbooks, on-call roster, comms templates, dashboards, and feature flag console.

## Exercise Flow

1. **Kickoff (5 min):** Announce scenario, objectives, and timeboxing; remind team to use UTC timestamps.
2. **Detection Signal (5 min):** Present initial alert/log snippet; confirm paging and channel setup.
3. **Triage (10 min):** Identify blast radius, classify severity using [INCIDENT_SEVERITY](INCIDENT_SEVERITY.md), and declare status.
4. **Containment (15 min):** Propose mitigations and select one; validate rollback paths and change freezes.
5. **Communications (10 min):** Draft internal + customer updates using [INCIDENT_TEMPLATE](INCIDENT_TEMPLATE.md); verify cadences.
6. **Recovery (10 min):** Describe recovery steps, data validation, and post-mitigation monitoring.
7. **Wrap-Up (10 min):** Capture actions, owners, and due dates; log evidence and schedule the post-incident review.

## Evaluation & Follow-Up

- Score outcomes against success criteria and MTTA/MTTR targets.
- Capture gaps in tooling (dashboards, alerts, runbooks) and file tickets.
- Verify on-call accuracy and access (runbooks, consoles, secrets) for all roles.
- Update runbooks and playbooks based on findings; brief stakeholders on readiness state.
