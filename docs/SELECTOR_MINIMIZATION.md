# Selector Minimization, Access Control, and Proof-of-Non-Collection

## Overview

This feature implements comprehensive data minimization controls, including:

1. **Selector Minimization Tracking** - Monitors how query selectors expand during execution
2. **Reason-for-Access Prompts** - Requires justification for broad or sensitive queries
3. **Anomaly Alerts** - Detects and alerts on over-broad or unusual query patterns
4. **Proof-of-Non-Collection (PNC) Reports** - Monthly reports proving certain data was NOT collected
5. **Tripwire Metrics** - Tracks violation rates over time to demonstrate continuous improvement

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    GraphQL Query                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│         selectorMinimizationMiddleware                       │
│  - Extract field selections                                  │
│  - Track query expansion                                     │
│  - Count records accessed/returned                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              PolicyEnforcer                                  │
│  - Validate reason-for-access                                │
│  - Check selector expansion limits                           │
│  - Enforce tripwire thresholds                               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│         SelectorMinimizationService                          │
│  - Calculate expansion ratios                                │
│  - Detect anomalies                                          │
│  - Check tripwire violations                                 │
│  - Store metrics                                             │
│  - Create alerts                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├──────────────────────────────────────────┐
                   │                                          │
                   ▼                                          ▼
┌─────────────────────────────────┐    ┌──────────────────────────────┐
│   TripwireMetricsService        │    │ ProofOfNonCollectionService  │
│  - Daily/weekly/monthly metrics │    │ - Monthly PNC reports        │
│  - Trend analysis               │    │ - Statistical sampling       │
│  - Improvement tracking         │    │ - Cryptographic proof        │
└─────────────────────────────────┘    └──────────────────────────────┘
```

### Database Schema

**Core Tables:**
- `query_scope_metrics` - Every query's selector expansion and scope
- `selector_minimization_baselines` - Statistical baselines for anomaly detection
- `tripwire_config` - Configurable thresholds per tenant/query type
- `selector_minimization_alerts` - Alerts for violations
- `tripwire_trend_metrics` - Aggregated metrics over time

**PNC Reporting:**
- `proof_of_non_collection_reports` - Monthly PNC reports
- `pnc_audit_samples` - Individual audit samples

**Views:**
- `recent_anomalies` - Last 7 days of anomalous queries
- `tripwire_dashboard` - Summary of violations and trends

## Usage

### 1. GraphQL Integration

Wrap resolvers with selector tracking:

```typescript
import { withSelectorTracking, withReasonRequired } from '../graphql/middleware/selectorMinimizationMiddleware.js';

const resolvers = {
  Query: {
    // Automatically track all queries
    users: withSelectorTracking(async (parent, args, context, info) => {
      // Your resolver logic
    }),

    // Require reason for sensitive queries
    sensitiveData: withReasonRequired(
      withSelectorTracking(async (parent, args, context, info) => {
        // Your resolver logic
      })
    ),
  },
};
```

### 2. Providing Reason-for-Access

Clients must include reason in GraphQL context:

```typescript
// GraphQL request headers or context
{
  "x-reason-for-access": "Investigating fraud case #12345 - analyzing transaction patterns",
  "x-purpose": "investigation"
}
```

### 3. Configure Tripwire Thresholds

Per-tenant configuration:

```sql
INSERT INTO tripwire_config (
  tenant_id, query_type, max_expansion_ratio,
  require_reason, block_on_violation, alert_on_violation
) VALUES (
  'tenant-123', 'graphql', 5.0,
  true, false, true
);
```

Or use environment variables for defaults:

```bash
SELECTOR_MAX_EXPANSION_RATIO=10.0
SELECTOR_ANOMALY_Z_SCORE=4.0
REQUIRE_REASON_FOR_EXPANSION_RATIO=5.0
```

### 4. Scheduled Jobs

Jobs run automatically via cron:

```typescript
import { initializeSelectorMinimizationJobs } from './jobs/selectorMinimizationJobs.js';

// In your server startup
initializeSelectorMinimizationJobs();
```

**Job Schedule:**
- **Daily 2:00 AM** - Calculate tripwire metrics for all tenants
- **Monday 3:00 AM** - Weekly metrics aggregation
- **1st of month 4:00 AM** - Monthly metrics aggregation
- **1st of month 5:00 AM** - Generate PNC reports
- **Daily 6:00 AM** - Archive old reports (7+ years)
- **Hourly** - Clean up old metrics (90+ days)
- **Sunday 1:00 AM** - Recalculate baselines

### 5. Query Metrics Dashboard

```typescript
import { tripwireMetricsService } from './services/TripwireMetricsService.js';

// Get improvement dashboard
const dashboard = await tripwireMetricsService.getImprovementDashboard('tenant-123');

console.log(dashboard);
// {
//   daily: {
//     currentViolationRate: 0.008,
//     percentageImprovement: 60.0,
//     isImproving: true,
//     timeToZeroViolations: 15
//   },
//   summary: {
//     currentDailyViolationRate: 0.008,
//     targetViolationRate: 0.01,
//     onTrack: true,
//     daysConsecutiveCompliance: 12
//   }
// }
```

### 6. Generate PNC Report

```typescript
import { proofOfNonCollectionService } from './services/ProofOfNonCollectionService.js';

// Generate report for last month
const report = await proofOfNonCollectionService.generateMonthlyReport(
  'tenant-123',
  2025,
  10, // October
  {
    dataCategories: ['biometric_data', 'genetic_data', 'health_records'],
    sampleRate: 0.05, // 5% sample
    samplingMethod: 'stratified'
  }
);

// Finalize if clean
if (report.violationsDetected === 0) {
  await proofOfNonCollectionService.finalizeReport(report.id);
}
```

## Metrics and Reporting

### Key Metrics Tracked

1. **Expansion Ratio** = `expandedSelectors / initialSelectors`
   - Measures how much a query expands (e.g., 1 field → 10 fields)
   - Alert threshold: >10x (configurable)

2. **Selectivity Ratio** = `recordsReturned / recordsAccessed`
   - Measures query efficiency (low = over-broad)
   - Indicates queries that scan many records but return few

3. **Violation Rate** = `violatedQueries / totalQueries`
   - Percentage of queries triggering tripwires
   - Target: <1% (configurable)

4. **Reason Compliance Rate** = `reasonsProvided / reasonsRequired`
   - Percentage compliance with reason-for-access requirements
   - Target: 100%

### Anomaly Detection

Uses statistical methods:
- **Z-score analysis** - Detects queries >4σ from baseline (default)
- **P95/P99 thresholds** - Flags queries exceeding historical 95th/99th percentiles
- **Pattern matching** - Identifies unusual query patterns

### Trend Analysis

Linear regression over time shows:
- **Improvement rate** - How fast violations are decreasing
- **Projection** - Estimated time to reach <1% violation rate
- **Consistency** - Consecutive periods below threshold

## Proof-of-Non-Collection Reports

### Report Structure

```json
{
  "reportId": "pnc-2025-10-tenant123",
  "period": {
    "month": 10,
    "year": 2025
  },
  "methodology": {
    "totalQueries": 1000000,
    "sampledQueries": 50000,
    "sampleRate": 0.05,
    "samplingMethod": "stratified"
  },
  "assertions": {
    "biometric_data": {
      "assertion": "NOT_COLLECTED",
      "confidence": 0.99,
      "sampleSize": 50000,
      "violationsCount": 0
    },
    "genetic_data": {
      "assertion": "NOT_COLLECTED",
      "confidence": 0.99,
      "sampleSize": 50000,
      "violationsCount": 0
    }
  },
  "reportHash": "a3f2...",
  "signature": "b7e1..."
}
```

### Sampling Methods

1. **Random** - Simple random sample
2. **Stratified** - Proportional sampling by query type
3. **Systematic** - Every Nth query

### Cryptographic Proof

- **SHA-256 hash** of report content
- **HMAC signature** with secret key
- **Immutable** once finalized
- **7-year retention** for compliance

## Alerts and Notifications

### Alert Types

1. **expansion_threshold** - Query exceeded expansion ratio limit
2. **anomaly_detected** - Statistical anomaly detected
3. **missing_reason** - Required reason not provided
4. **excessive_records** - Too many records accessed

### Alert Severity

- **Critical** - >5x threshold violation
- **High** - 3-5x threshold violation
- **Medium** - 2-3x threshold violation
- **Low** - 1.5-2x threshold violation

### Alert Flow

```
Query Violation
      ↓
Alert Created (status: open)
      ↓
Real-time Notification (Redis pub/sub)
      ↓
Dashboard Update
      ↓
Manual/Auto Resolution
      ↓
Alert Closed (status: resolved)
```

## Compliance

### GDPR Art. 5(1)(c) - Data Minimization

> Personal data shall be adequate, relevant and limited to what is necessary

**Implementation:**
- Tracks whether queries access more data than needed
- Requires justification for broad queries
- Demonstrates reduction in over-broad queries over time
- Proves certain categories were NOT collected (PNC reports)

### CCPA Section 1798.100 - Collection Limitation

> Businesses shall not collect personal information beyond what is reasonably necessary

**Implementation:**
- Monitors record access patterns
- Alerts on excessive data collection
- Provides audit trail of access justification
- Monthly reports proving compliance

### SOC 2 CC6.1 - Logical Access

> Restricts access to information assets to authorized users

**Implementation:**
- Reason-for-access requirement
- Purpose-based access control (via PolicyEnforcer)
- Audit logging of all access decisions
- Anomaly detection for unusual access patterns

## Configuration Presets

### Strict (Production)

```typescript
{
  maxExpansionRatio: 5.0,
  maxRecordsAccessed: 10000,
  requireReason: true,
  blockOnViolation: true,
  alertOnViolation: true
}
```

### Standard (Default)

```typescript
{
  maxExpansionRatio: 10.0,
  maxRecordsAccessed: 50000,
  requireReason: false,
  blockOnViolation: false,
  alertOnViolation: true
}
```

### Compliance (Healthcare/Finance)

```typescript
{
  maxExpansionRatio: 3.0,
  maxRecordsAccessed: 5000,
  requireReason: true,
  blockOnViolation: true,
  alertOnViolation: true
}
```

## Testing

### Unit Tests

```typescript
import { selectorMinimizationService } from './services/SelectorMinimizationService.js';

describe('Selector Minimization', () => {
  it('should detect tripwire violations', async () => {
    const metrics = {
      tenantId: 'test',
      userId: 'user1',
      queryId: 'q1',
      queryType: 'graphql',
      initialSelectors: 1,
      expandedSelectors: 15,
      recordsAccessed: 1000,
      recordsReturned: 10,
      executionTimeMs: 100,
      executedAt: new Date(),
      // ... other fields
    };

    await selectorMinimizationService.trackQueryScope(metrics);

    // Check that violation was detected
    const alerts = await selectorMinimizationService.getOpenAlerts('test');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].alertType).toBe('expansion_threshold');
  });
});
```

### Integration Tests

Test the full flow from GraphQL query to alert generation.

## Performance Considerations

1. **Async tracking** - Metrics are tracked asynchronously to avoid blocking queries
2. **Caching** - Baselines and configs are cached in Redis (1-hour TTL)
3. **Batch processing** - Baseline updates happen in background
4. **Sampling** - PNC reports use 5% sample by default (configurable)
5. **Retention** - Old metrics are cleaned up automatically (90-day default)

## Monitoring

### Prometheus Metrics

- `policy_decisions_total` - Policy decision counter
- `reason_violations_total` - Reason-for-access violations
- `selector_expansion_violations_total` - Tripwire violations

### Logs

All events are logged with structured data:

```json
{
  "level": "info",
  "message": "Query scope tracked",
  "queryId": "abc123",
  "expansionRatio": 8.5,
  "tripwireTriggered": false,
  "isAnomaly": false
}
```

## Troubleshooting

### High False Positive Rate

Adjust anomaly detection threshold:
```bash
SELECTOR_ANOMALY_Z_SCORE=5.0  # More lenient (default: 4.0)
```

### Queries Being Blocked

1. Check tripwire configuration
2. Verify reason-for-access is provided
3. Review alert details
4. Consider raising thresholds for development

### PNC Report Generation Fails

1. Check sample size is sufficient
2. Verify data categories are configured
3. Review logs for specific errors
4. Ensure database has query metrics

## Future Enhancements

- [ ] Machine learning for anomaly detection
- [ ] Automated query optimization suggestions
- [ ] Real-time dashboard with charts
- [ ] Slack/email notifications for critical alerts
- [ ] Query fingerprinting for better pattern matching
- [ ] Integration with SIEM systems
- [ ] Automated remediation workflows

## References

- GDPR Article 5(1)(c): https://gdpr-info.eu/art-5-gdpr/
- CCPA Section 1798.100: https://leginfo.legislature.ca.gov/
- SOC 2 Trust Principles: https://www.aicpa.org/soc
- Data Minimization Best Practices: NIST Privacy Framework

## Support

For questions or issues:
- Check logs: `/var/log/summit/selector-minimization.log`
- Review metrics: Prometheus dashboard
- Consult configuration: `/server/src/config/selectorMinimization.ts`
