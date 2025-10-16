### Context

Source: SPRINT_PROVENANCE_FIRST.md - 6) Work Breakdown (By Workstream) - DevEx / SRE
Excerpt/why: "SLO dashboards: p95 query latency"

### Problem / Goal

Develop a dashboard to monitor p95 query latency as a Service Level Objective.

### Proposed Approach

Configure a Grafana dashboard (or similar) to visualize p95 query latency metrics collected from the system, setting appropriate alerts for SLO breaches.

### Tasks

- [ ] Identify query latency metrics sources.
- [ ] Configure Grafana dashboard for p95 latency.
- [ ] Define SLO thresholds and alerts.

### Acceptance Criteria

- Given the system is operating, when the dashboard is viewed, then it accurately displays p95 query latency and alerts on SLO breaches.
- Metrics/SLO: Dashboard shows p95 query latency < 1.5s.
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
