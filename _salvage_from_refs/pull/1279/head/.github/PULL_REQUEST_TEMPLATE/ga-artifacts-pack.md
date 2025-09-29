## IntelGraph GA Artifacts Pack

This PR adds GA operational assets and documentation for v1.0.0 cutover.

### Contents
- Docs: GA scorecard/runbook, Go/No-Go checklist, PagerDuty routing, Release Notes
- Ops: k6 suites, Chaos Mesh specs, Prometheus recording/alerts, Alertmanager routes, Grafana dashboard, Helm canary values, CD workflow reference

### Secrets/Config
- k6 workflow needs: `K6_API_URL`, `K6_APQ_HASH`, `K6_TENANT_ID`, `K6_USER`, `K6_PASS`, `K6_WS_URL`, `K6_JWT`
- Alert routing: `PD_ROUTING_KEY` for PagerDuty receiver

### Run Order (recommended)
1) Apply Prometheus recording rules then SLO burn alerts
2) Configure Alertmanager routes
3) Import Grafana dashboard
4) Enable k6 soak workflow (or run on-demand)
5) Use Helm canary overrides during ramp (1%→5%→25%→50%→100%)

### Links
- GA Scorecard: docs/runbooks/ga-operational-scorecard.md
- Go/No-Go Checklist: docs/runbooks/ga-go-no-go-checklist.md
- PagerDuty Matrix: docs/incident/pagerduty-routing-matrix.md
- Release Notes: docs/releases/RELEASE_NOTES_v1.0.0.md

### Owners
- SRE, Platform, Security — please review alert labels/routing and secrets

