# AI Governance Metrics Dashboard

> **Version**: 1.0.0
> **Last Updated**: 2025-12-02
> **Status**: Production Ready

## Overview

The AI Governance Metrics Dashboard provides real-time visibility into AI system governance, compliance status, and risk metrics. It implements ODNI (Office of the Director of National Intelligence) mandated 85% validation tracking and provides comprehensive incident trend analysis with explicit compliance gap display.

## Key Features

### 1. ODNI 85% Validation Tracking

The dashboard prominently displays AI decision validation rates against the ODNI-mandated 85% minimum threshold.

**Key Metrics:**
- Current validation rate (percentage)
- Target rate (85%)
- Trend indicator (up/down/stable)
- Breakdown by decision category
- Compliance status (Met/Not Met)

**Alerts:**
- Critical: Validation rate below 85%
- Warning: Validation rate between 85-88% (approaching threshold)
- Info: Declining trend detected

### 2. Incident Trend Visualization

Real-time incident tracking with comprehensive trend analysis.

**Features:**
- Current period vs. previous period comparison
- Incidents by severity (Critical, High, Medium, Low)
- Incidents by category
- Mean Time To Resolve (MTTR)
- Timeline visualization
- Active incident count

### 3. Compliance Gaps Display

Explicit display of all open compliance gaps requiring attention.

**Information Displayed:**
- Framework (SOC2, GDPR, etc.)
- Requirement ID
- Category
- Severity level
- Current vs. required state
- Remediation plan
- Due date and days remaining
- Owner assignment
- Status (Open, In Progress, Mitigated, Accepted)

### 4. Risk Score Tracking

Overall governance risk score with component breakdown.

**Components:**
- Data Security
- Access Control
- Compliance
- Model Governance
- Audit Trail

**Risk Levels:**
- Low (80-100): Green
- Medium (60-79): Yellow
- High (40-59): Orange
- Critical (0-39): Red

### 5. Model Governance

AI/ML model lifecycle governance metrics.

**Tracked:**
- Total registered models
- Approved/Pending/Rejected counts
- Deployment success rate
- Bias detection and remediation
- Risk tier distribution

### 6. Audit Trail

Complete audit logging of all governance-related events.

**Event Types:**
- Model deployments
- Policy changes
- Access grants/revokes
- Configuration changes
- Incident creation/resolution
- Validation events
- Compliance checks

## Performance Requirements

### SLO: p95 Latency < 2 seconds

The dashboard is optimized for sub-2-second response times at the 95th percentile.

**Optimization Strategies:**
1. Redis caching with 30-second TTL
2. Parallel Prometheus queries
3. Efficient data aggregation
4. Incremental updates via subscriptions

**Monitoring:**
- `governance_dashboard_request_duration_seconds` histogram
- `governance_metrics_refresh_duration_seconds` histogram
- Prometheus alerting on SLO breach

## Architecture

### Frontend (React)

```
client/src/components/governance/
├── GovernanceMetricsDashboard.tsx   # Main dashboard component
├── GovernanceTab.tsx                # Legacy governance tab
└── __tests__/
    └── GovernanceMetricsDashboard.test.tsx
```

### Backend (Node.js)

```
server/src/governance/analytics/
├── types.ts                         # TypeScript interfaces
├── prometheus-queries.ts            # Prometheus query definitions
├── governance-metrics-service.ts    # Main service
├── graphql-schema.ts               # GraphQL types and resolvers
├── routes.ts                       # REST API routes
├── index.ts                        # Module exports
└── __tests__/
    └── governance-metrics-service.test.ts
```

### Observability

```
observability/prometheus/
└── governance-alerts.yaml          # Alerting rules
```

## API Reference

### GraphQL

```graphql
query GetGovernanceMetrics($input: GovernanceMetricsInput!) {
  governanceMetrics(input: $input) {
    validationRate {
      validationRate
      meetsODNIRequirement
      breakdown { ... }
    }
    incidentTrends { ... }
    complianceGaps { ... }
    riskScore { ... }
    auditTrail { ... }
    modelGovernance { ... }
  }
}
```

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/governance/metrics` | All governance metrics |
| GET | `/api/governance/validation` | ODNI validation metrics |
| GET | `/api/governance/incidents` | Incident trends |
| GET | `/api/governance/compliance-gaps` | Compliance gaps |
| POST | `/api/governance/compliance-gaps` | Create compliance gap |
| GET | `/api/governance/risk-score` | Risk score data |
| GET | `/api/governance/audit-trail` | Audit events |
| POST | `/api/governance/audit-trail` | Record audit event |
| GET | `/api/governance/models` | Model governance metrics |
| GET | `/api/governance/config` | Dashboard configuration |
| GET | `/api/governance/export` | Export data (CSV/JSON) |

## Configuration

### Dashboard Configuration

```typescript
{
  refreshIntervalSeconds: 30,
  defaultTimeRange: {
    start: Date.now() - 24 * 60 * 60 * 1000,
    end: Date.now(),
    label: 'Last 24 hours'
  },
  alertThresholds: {
    validationRateWarning: 88,
    validationRateCritical: 85,
    riskScoreWarning: 70,
    riskScoreCritical: 50,
    incidentCountWarning: 5,
    incidentCountCritical: 10
  },
  features: {
    realTimeUpdates: true,
    exportEnabled: true,
    alertsEnabled: true,
    advancedAnalytics: true
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROMETHEUS_URL` | `http://localhost:9090` | Prometheus server URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis cache URL |
| `GOVERNANCE_REFRESH_MS` | `30000` | Metrics refresh interval |
| `GOVERNANCE_REALTIME` | `true` | Enable real-time updates |

## Prometheus Metrics

### Exported Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `governance_dashboard_request_duration_seconds` | Histogram | Dashboard request latency |
| `governance_metrics_refresh_duration_seconds` | Histogram | Metrics refresh latency |
| `governance_validation_rate_percent` | Gauge | Current validation rate |
| `governance_compliance_gaps_open` | Gauge | Open compliance gaps |
| `governance_risk_score_current` | Gauge | Current risk score |

### Queried Metrics

| Metric | Description |
|--------|-------------|
| `ai_decisions_validated_total` | Validated AI decisions |
| `ai_decisions_total` | Total AI decisions |
| `governance_incidents_total` | Total governance incidents |
| `governance_incident_resolution_seconds` | Incident resolution time |
| `compliance_gaps_open_total` | Open compliance gaps |
| `governance_risk_score_percent` | Risk score by component |

## Alerting Rules

### Critical Alerts

1. **ODNIValidationRateCritical**: Validation rate below 85%
2. **CriticalComplianceGapOpen**: Critical severity gap detected
3. **CriticalIncidentOpen**: Critical governance incident
4. **GovernanceRiskScoreCritical**: Risk score below 50%

### Warning Alerts

1. **ODNIValidationRateWarning**: Validation rate 85-88%
2. **GovernanceDashboardLatencyHigh**: P95 latency > 2s
3. **HighComplianceGapCount**: More than 5 high-severity gaps
4. **GovernanceIncidentSpike**: Incident rate doubled

## Usage

### Basic Usage

```tsx
import { GovernanceMetricsDashboard } from '@/components/governance/GovernanceMetricsDashboard';

function App() {
  return (
    <GovernanceMetricsDashboard
      tenantId="your-tenant-id"
      realTimeEnabled={true}
      onExport={(format) => console.log(`Exporting as ${format}`)}
    />
  );
}
```

### API Integration

```typescript
import { createGovernanceMetricsService } from '@/governance/analytics';

const service = createGovernanceMetricsService({
  prometheusUrl: 'http://prometheus:9090',
  redisUrl: 'redis://redis:6379',
  refreshIntervalMs: 30000,
  enableRealTime: true,
});

const metrics = await service.getGovernanceMetrics(tenantId, {
  start: Date.now() - 86400000,
  end: Date.now(),
  label: 'Last 24 hours',
});
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT authentication
2. **Authorization**: Tenant-scoped data access via RBAC
3. **Audit Logging**: All API calls are logged
4. **Data Encryption**: TLS 1.3 for transport, AES-256 at rest
5. **Rate Limiting**: 100 requests/minute per tenant

## Testing

### Unit Tests

```bash
# Run dashboard component tests
pnpm test -- GovernanceMetricsDashboard.test.tsx

# Run service tests
pnpm test -- governance-metrics-service.test.ts
```

### Integration Tests

```bash
pnpm test:integration -- governance
```

### E2E Tests

```bash
pnpm e2e -- governance-dashboard
```

## Troubleshooting

### Common Issues

**1. Metrics Not Loading**
- Check Prometheus connectivity
- Verify metrics are being scraped
- Check Redis cache status

**2. High Latency**
- Review Prometheus query complexity
- Check Redis cache hit rate
- Scale service replicas

**3. Validation Rate Incorrect**
- Verify `ai_decisions_*` metrics are being emitted
- Check time range alignment
- Review Prometheus query aggregation

### Debug Mode

Enable debug logging:
```bash
DEBUG=governance:* pnpm start
```

## Roadmap

### Planned Features

- [ ] Custom dashboard layouts
- [ ] Scheduled compliance reports
- [ ] Integration with ticketing systems
- [ ] Predictive compliance analytics
- [ ] Multi-tenant comparison views

## Support

- **Documentation**: https://docs.intelgraph.io/governance
- **Runbooks**: `/RUNBOOKS/governance/`
- **On-call**: #governance-oncall Slack channel
- **Issues**: https://github.com/BrianCLong/summit/issues

## Changelog

### v1.0.0 (2025-12-02)
- Initial release
- ODNI 85% validation tracking
- Incident trend visualization
- Compliance gaps display
- Risk score tracking
- Model governance metrics
- Audit trail
- GraphQL and REST APIs
- Prometheus integration
- Sub-2s p95 latency SLO
