### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - DevEx / SRE
Excerpt/why: "SLO dashboards: export duration"

### Problem / Goal

Develop a dashboard to monitor the duration of data export operations as a Service Level Objective.

### Proposed Approach

Configure a Grafana dashboard (or similar) to visualize export duration metrics collected from the system, setting appropriate alerts for SLO breaches.

### Tasks

- [ ] Identify export duration metrics sources.
- [ ] Configure Grafana dashboard for export duration.
- [ ] Define SLO thresholds and alerts.

### Acceptance Criteria

- Given the system is exporting data, when the dashboard is viewed, then it accurately displays export duration and alerts on SLO breaches.
- Metrics/SLO: Dashboard shows export duration within defined SLO.
- Tests: N/A
- Observability: Dashboard is live and accessible.

### Safety & Policy

- Action class: READ
- OPA rule(s) evaluated: N/A

### Dependencies

Blocks: None
Depends on: None

### DOR / DOD

- DOR: SLO dashboard design approved.
- DOD: Dashboard implemented, documentation updated.

### Links

- Docs: SPRINT_PROVENANCE_FIRST.md
