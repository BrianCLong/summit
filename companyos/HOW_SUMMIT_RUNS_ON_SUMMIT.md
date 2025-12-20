# How Summit Runs on Summit

## Overview

CompanyOS is Summit's internal operational intelligence platform that demonstrates **dogfooding at scale**. This document explains how Summit uses itself to manage its own operations, including:

- 🚨 **Incident Management** - Track and resolve operational incidents
- 🚀 **Deployment Tracking** - Monitor deployments across all environments
- 📊 **SLO Monitoring** - Track service level objectives and error budgets
- 🔔 **Alert Management** - Centralize alerts from Prometheus, GitHub Actions, and other sources
- 📖 **Runbook Execution** - Document and track operational procedures
- 🗓️ **On-Call Schedules** - Manage on-call rotations and escalations
- 📝 **Postmortems** - Document incidents and derive learnings
- 🏗️ **Architecture Decisions** - Track ADRs and design decisions
- 🛣️ **Roadmap Management** - Plan and track epic-level work
- 👥 **Customer Requests** - Manage demos and feature requests

## Architecture

### Database Layer

All operational data is stored in PostgreSQL using the `maestro` schema:

```sql
-- Core operational tables
maestro.incidents          -- Incident tracking
maestro.deployments        -- Deployment history
maestro.slo_violations     -- SLO breach tracking
maestro.alerts             -- Alert history
maestro.runbooks           -- Runbook catalog
maestro.runbook_executions -- Runbook execution tracking
maestro.on_call_schedules  -- On-call rotations
maestro.postmortems        -- Postmortem documents
maestro.adrs               -- Architecture decision records
maestro.roadmap_items      -- Epic/roadmap tracking
maestro.customer_requests  -- Demo and feature requests
```

**Migration:** `server/src/db/migrations/postgres/009_create_companyos_operational_tables.sql`

### Backend Services

TypeScript services provide business logic:

- **IncidentService** - Create, update, resolve incidents
- **DeploymentService** - Track deployments, calculate DORA metrics
- **AlertService** - Manage alerts, deduplication, correlation
- **SLOService** - Track SLO violations, error budget

**Location:** `companyos/src/services/`

### API Layer

REST APIs for operational data:

```
GET    /api/companyos/incidents              - List incidents
POST   /api/companyos/incidents              - Create incident
PATCH  /api/companyos/incidents/:id          - Update incident
POST   /api/companyos/incidents/:id/resolve  - Resolve incident

GET    /api/companyos/deployments            - List deployments
GET    /api/companyos/deployments/stats      - Deployment statistics
POST   /api/companyos/deployments            - Create deployment
POST   /api/companyos/deployments/:id/rollback - Rollback deployment

GET    /api/companyos/alerts                 - List alerts
GET    /api/companyos/alerts/firing          - Get firing alerts
POST   /api/companyos/alerts/:id/acknowledge - Acknowledge alert

GET    /api/companyos/dashboard              - Unified dashboard
```

**Location:** `companyos/src/api/`

### GraphQL Schema

Rich GraphQL API for operational queries:

```graphql
type Incident {
  id: ID!
  title: String!
  severity: IncidentSeverity!
  status: IncidentStatus!
  commander: String
  alerts: [Alert!]
  postmortem: Postmortem
}

type Deployment {
  id: ID!
  serviceName: String!
  environment: DeploymentEnvironment!
  status: DeploymentStatus!
  deployedBy: String!
}

type Alert {
  id: ID!
  alertName: String!
  severity: AlertSeverity!
  status: AlertStatus!
  incident: Incident
}
```

**Location:** `server/src/graphql/schema.companyos.ts`

### UI Layer

React dashboard showing real-time operational status:

- **OperationsDashboard** - Unified view of incidents, alerts, deployments, SLOs
- **IncidentDetail** - Incident management interface
- **DeploymentTimeline** - Deployment history and DORA metrics
- **SLODashboard** - SLO compliance and error budget tracking

**Location:** `client/src/features/companyos/pages/`

## Integration Points

### 1. GitHub Integration

**Automatic Incident Tracking:**
- Issues labeled `incident` automatically create incidents in CompanyOS
- Issue closure resolves corresponding incidents
- Links maintained between GitHub issues and internal incidents

**Deployment Tracking:**
- GitHub Actions workflow runs automatically create deployment records
- Deployment success/failure automatically updates status
- Commit SHAs, run URLs, and release URLs tracked

**Webhook Endpoint:** `POST /api/companyos/github-webhook`

**Configuration:**
```bash
# Set in GitHub repository webhooks
URL: https://summit.example.com/api/companyos/github-webhook
Secret: $GITHUB_WEBHOOK_SECRET
Events: issues, workflow_run, deployment, deployment_status
```

**Location:** `companyos/src/integrations/githubWebhook.ts`

### 2. Prometheus/Alertmanager Integration

**Automatic Alert Ingestion:**
- Alertmanager forwards all alerts to CompanyOS
- Alerts deduplicated using fingerprints
- Alert resolution tracked automatically

**SLO Violation Detection:**
- Alerts with `slo_name` label create SLO violation records
- Error budget impact calculated
- Historical violation tracking for compliance reporting

**Auto-Incident Creation:**
- Critical alerts automatically create SEV1/SEV2 incidents
- Alerts grouped by fingerprint to prevent duplicate incidents
- Customer-facing services flagged for immediate attention

**Webhook Endpoint:** `POST /api/companyos/prometheus-webhook`

**Configuration:**
```yaml
# alerting/alertmanager.yml
receivers:
  - name: 'companyos'
    webhook_configs:
      - url: 'https://summit.example.com/api/companyos/prometheus-webhook'
        send_resolved: true
```

**Location:** `companyos/src/integrations/prometheusWebhook.ts`

### 3. CI/CD Integration

**Deployment Tracking:**
- CI/CD systems can POST to `/api/companyos/deployments`
- Tracks: service name, version, environment, deployer, commit SHA
- Automatically calculates deployment frequency (DORA metric)

**Example GitHub Actions Integration:**
```yaml
# .github/workflows/deploy.yml
- name: Record Deployment
  run: |
    curl -X POST https://summit.example.com/api/companyos/deployments \
      -H "Content-Type: application/json" \
      -d '{
        "serviceName": "${{ github.repository }}",
        "version": "${{ github.sha }}",
        "environment": "production",
        "deployedBy": "${{ github.actor }}",
        "commitSha": "${{ github.sha }}",
        "githubRunUrl": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
      }'
```

### 4. AI Copilot Integration

**Incident Analysis:**
- Summarize incident timeline
- Suggest similar past incidents
- Recommend runbooks based on alert patterns

**Postmortem Generation:**
- Auto-draft postmortems from incident data
- Extract root cause patterns
- Suggest action items based on similar incidents

**Runbook Suggestions:**
- Match alerts to relevant runbooks
- Surface ADRs related to affected services
- Recommend mitigation steps

**Future Enhancement:** `companyos/src/services/aiCopilotService.ts`

## Usage Examples

### Creating an Incident

**Via API:**
```bash
curl -X POST https://summit.example.com/api/companyos/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API latency spike in us-east-1",
    "severity": "sev2",
    "affectedServices": ["api-gateway", "entity-service"],
    "commander": "alice@summit.com",
    "customerImpact": true,
    "impactDescription": "P95 latency increased to 2.5s"
  }'
```

**Via GitHub:**
1. Create issue with `incident` label
2. Add severity label: `sev1`, `sev2`, `sev3`, or `sev4`
3. Issue automatically syncs to CompanyOS

### Tracking a Deployment

**Automatic (via GitHub Actions):**
- Push to `main` branch triggers deployment workflow
- Workflow run automatically creates deployment record
- Success/failure updates deployment status

**Manual (via API):**
```bash
# Start deployment
curl -X POST https://summit.example.com/api/companyos/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "api-gateway",
    "version": "v2.5.0",
    "environment": "production",
    "deployedBy": "bob@summit.com"
  }'

# Mark successful
curl -X POST https://summit.example.com/api/companyos/deployments/{id}/succeeded
```

### Responding to Alerts

**Automatic Flow:**
1. Prometheus detects SLO violation
2. Alertmanager sends webhook to CompanyOS
3. Alert created, SLO violation recorded
4. If critical, incident auto-created
5. On-call engineer notified via PagerDuty

**Manual Response:**
```bash
# Acknowledge alert
curl -X POST https://summit.example.com/api/companyos/alerts/{id}/acknowledge

# Link to incident
curl -X POST https://summit.example.com/api/companyos/alerts/{id}/link-incident \
  -d '{"incidentId": "incident-uuid"}'

# Resolve alert
curl -X POST https://summit.example.com/api/companyos/alerts/{id}/resolve
```

## DORA Metrics

CompanyOS automatically calculates the four DORA metrics:

### 1. Deployment Frequency
- Tracked: Number of deployments per service per environment
- Aggregation: Daily, weekly, monthly
- Query: `GET /api/companyos/deployments/stats`

### 2. Lead Time for Changes
- Tracked: Time from commit to production deployment
- Calculation: `deployment.started_at - commit.authored_at`
- View: DORA metrics dashboard

### 3. Mean Time to Recovery (MTTR)
- Tracked: Time from incident start to resolution
- Calculation: `incident.resolved_at - incident.started_at`
- Query: View `maestro.active_incidents_view`

### 4. Change Failure Rate
- Tracked: Percentage of deployments that fail or require rollback
- Calculation: `(failed + rolled_back) / total_deployments`
- Query: `GET /api/companyos/deployments/stats`

### Dashboard View

```
+------------------+-------------------+-------------------+------------------+
| Deploy Frequency | Lead Time         | MTTR              | Change Fail Rate |
+------------------+-------------------+-------------------+------------------+
| 8.3 per day      | 45 minutes        | 22 minutes        | 2.4%             |
| ↑ 12% vs last mo | ↓ 5 min vs last mo| ↓ 8 min vs last mo| ↓ 0.8% vs last mo|
+------------------+-------------------+-------------------+------------------+
```

## Operational Runbooks

### Syncing Runbooks

CompanyOS tracks all runbooks in the `RUNBOOKS/` directory:

```bash
# Sync runbooks to database
curl -X POST https://summit.example.com/api/companyos/runbooks/sync
```

This parses YAML runbooks and creates database records for:
- Runbook metadata (title, category, estimated duration)
- Related services
- Execution history
- Success rates

### Executing a Runbook

```bash
# Start runbook execution
curl -X POST https://summit.example.com/api/companyos/runbook-executions \
  -d '{
    "runbookId": "uuid",
    "incidentId": "incident-uuid",
    "triggeredBy": "alice@summit.com",
    "triggerSource": "incident"
  }'

# Update execution progress
curl -X PATCH https://summit.example.com/api/companyos/runbook-executions/{id} \
  -d '{
    "stepsCompleted": 3,
    "stepsTotal": 5,
    "currentStep": "Rolling back deployment"
  }'
```

## ADR (Architecture Decision Records)

### Syncing ADRs

```bash
# Sync ADRs from adr/ directory
curl -X POST https://summit.example.com/api/companyos/adrs/sync
```

### Linking ADRs to Implementations

```graphql
mutation LinkADRToRoadmap {
  updateRoadmapItem(
    id: "epic-uuid"
    input: { relatedAdrIds: ["adr-uuid-1", "adr-uuid-2"] }
  ) {
    id
    title
    relatedAdrs {
      adrNumber
      title
      status
    }
  }
}
```

## Roadmap Management

### Syncing from Backlog

```bash
# Sync epics from backlog.json
curl -X POST https://summit.example.com/api/companyos/roadmap/sync
```

### Linking to GitHub

```graphql
mutation UpdateRoadmapProgress {
  updateRoadmapItem(
    id: "epic-uuid"
    input: {
      status: IN_PROGRESS
      progressPercentage: 45
      githubMilestoneUrl: "https://github.com/org/repo/milestone/12"
    }
  ) {
    id
    progressPercentage
  }
}
```

## Postmortems

### Creating a Postmortem

```bash
curl -X POST https://summit.example.com/api/companyos/postmortems \
  -d '{
    "incidentId": "incident-uuid",
    "title": "API Latency Spike - 2024-01-15",
    "rootCauseAnalysis": "Database connection pool exhaustion",
    "actionItems": [
      {
        "description": "Increase connection pool size",
        "owner": "alice@summit.com",
        "dueDate": "2024-01-30"
      }
    ],
    "lessonsLearned": [
      "Need better connection pool monitoring",
      "Auto-scaling policies need tuning"
    ]
  }'
```

### Publishing a Postmortem

```bash
curl -X PATCH https://summit.example.com/api/companyos/postmortems/{id} \
  -d '{"status": "published"}'
```

## Demo Scenario: "Summit Operating Itself"

### Live Demo Flow

1. **Show Dashboard**
   - Navigate to `/companyos/dashboard`
   - Point out: active incidents, firing alerts, recent deployments
   - Highlight: "This is Summit managing Summit"

2. **Trigger an Alert**
   - Use Prometheus to fire a test alert
   - Watch alert appear in dashboard in real-time
   - Show auto-created incident for critical alert

3. **Acknowledge and Respond**
   - Click into incident
   - Assign commander
   - Link related runbook
   - Execute runbook steps

4. **Track Deployment**
   - Trigger a deployment via GitHub Actions
   - Show deployment appear in timeline
   - Demonstrate deployment stats and DORA metrics

5. **Resolve Incident**
   - Mark incident as resolved
   - Show postmortem creation
   - Link to GitHub issue

6. **Review Metrics**
   - Show DORA metrics dashboard
   - Highlight SLO compliance
   - Review historical incident trends

## Benefits of Dogfooding

1. **Trust through Use** - We trust Summit because we depend on it daily
2. **Rapid Feedback** - Issues discovered immediately by internal users
3. **Feature Validation** - Features proven with real operational data
4. **Sales Credibility** - "We run our own operations on Summit"
5. **Continuous Improvement** - Internal usage drives product evolution

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/summit

# GitHub Integration
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_TOKEN=ghp_your-token

# Prometheus
PROMETHEUS_URL=http://localhost:9090

# CompanyOS API
COMPANYOS_API_URL=https://summit.example.com/api/companyos
```

### Alertmanager Configuration

```yaml
# alerting/alertmanager.yml
route:
  receiver: 'companyos'
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-and-companyos'

receivers:
  - name: 'companyos'
    webhook_configs:
      - url: 'https://summit.example.com/api/companyos/prometheus-webhook'
        send_resolved: true
```

## Monitoring CompanyOS Itself

### Health Checks

```bash
curl https://summit.example.com/api/companyos/health
```

### Metrics

CompanyOS exposes Prometheus metrics:

```
# /metrics endpoint
companyos_incidents_total{severity="sev1"}
companyos_incidents_total{severity="sev2"}
companyos_deployments_total{environment="production",status="succeeded"}
companyos_alerts_total{severity="critical",status="firing"}
companyos_slo_violations_total{service="api-gateway"}
```

## Troubleshooting

### Incidents Not Syncing from GitHub

1. Check webhook secret: `GITHUB_WEBHOOK_SECRET`
2. Verify webhook is enabled in GitHub repo settings
3. Check logs: `docker logs companyos-api`
4. Test webhook: Settings → Webhooks → Recent Deliveries → Redeliver

### Alerts Not Creating Incidents

1. Verify Alertmanager config points to CompanyOS webhook
2. Check alert labels include `severity`
3. Ensure critical alerts have `customer_facing` or `service` labels
4. Review logs for webhook errors

### Dashboard Not Loading

1. Check API health: `GET /api/companyos/health`
2. Verify database connection
3. Check browser console for errors
4. Ensure migrations have run: `009_create_companyos_operational_tables.sql`

## Future Enhancements

- [ ] **Real-time Subscriptions** - WebSocket/SSE for live dashboard updates
- [ ] **AI-Powered Insights** - Copilot integration for incident analysis
- [ ] **Chaos Engineering Integration** - Track chaos drill outcomes
- [ ] **DR Drill Tracking** - Document and track disaster recovery exercises
- [ ] **Cost Attribution** - Link deployments to infrastructure costs
- [ ] **Benchmark Integration** - Surface benchmark regressions in deployments
- [ ] **Compliance Evidence** - Auto-generate SOC2 evidence from operational data
- [ ] **Mobile App** - On-call mobile interface for incident response

## Related Documentation

- [Incident Response Runbook](../RUNBOOKS/incident-response.yaml)
- [Deployment Guide](../RUNBOOKS/deploy-promote.md)
- [SLO Configuration](../slo-config.yaml)
- [Alert Policies](../ALERT_POLICIES.yaml)
- [ADR Template](../adr/adr-template.md)

## Support

For questions or issues with CompanyOS:

- **Slack:** #companyos-support
- **GitHub Issues:** [Create Issue](https://github.com/summit/summit/issues/new?labels=companyos)
- **On-Call:** PagerDuty escalation policy: `companyos-oncall`

---

**CompanyOS: Summit runs on Summit. Dogfooding at scale.**
