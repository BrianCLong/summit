# Prompt 10: Cost Guardrails + Usage Metering

## Role
FinOps Engineer

## Context
IntelGraph operates under strict budget constraints:
- **Predictable costs** - Prevent budget overruns
- **Usage transparency** - Understand cost drivers
- **Optimization opportunities** - Identify waste
- **Quota management** - Prevent abuse

Cost observability and proactive alerting are critical for SaaS sustainability.

## Task
Implement a cost metering and guardrails system:

### 1. Per-Unit Metering
- GraphQL API calls (queries, mutations)
- Ingested events (by connector type)
- Graph traversals (by hop count)
- Storage (entities, relationships, documents)
- Compute (copilot queries, ML inference)

### 2. Cost Model
- Configurable unit costs
- Multi-dimensional cost allocation (tenant, user, investigation)
- Projected monthly costs based on current usage

### 3. Budgets & Alerts
- Environment-specific budgets (dev, staging, prod)
- Alert at 80% of budget
- Daily cost reports
- Cost anomaly detection

## Guardrails

### Cost Targets (Configurable)
- **Ingest**: ≤ $0.10 per 1,000 events
- **GraphQL**: ≤ $2.00 per 1M calls
- **Storage**: ≤ $0.05 per GB-month
- **Compute**: ≤ $0.10 per copilot query

### Budgets (Example)
- **Development**: $500/month
- **Staging**: $1,000/month
- **Production**: $10,000/month

## Deliverables

### 1. Cost Metering Library
- [ ] `libs/cost/` package with:
  - [ ] Metering middleware for Express/Fastify
  - [ ] Cost calculation engine
  - [ ] Multi-dimensional tagging (tenant, user, investigation)
  - [ ] Cost event emitter

### 2. Metrics Export
- [ ] Prometheus exporter for cost metrics
- [ ] OpenTelemetry meter integration
- [ ] Custom metrics:
  - [ ] `api_calls_total{tenant, user, operation}`
  - [ ] `ingest_events_total{connector, tenant}`
  - [ ] `graph_traversals_total{hops, tenant}`
  - [ ] `cost_usd{dimension, resource}`

### 3. Daily Cost Report Job
- [ ] `services/cost-reporter/` with:
  - [ ] Daily aggregation job
  - [ ] Cost breakdown by tenant/user/resource
  - [ ] Projected monthly costs
  - [ ] Comparison to budget
  - [ ] Anomaly detection (>20% increase day-over-day)

### 4. Budget Alerts
- [ ] Prometheus alerting rules for budget thresholds
- [ ] Alert at 80%, 90%, 100% of budget
- [ ] Cost anomaly alerts
- [ ] Integration with incident management

### 5. Grafana Cost Dashboard
- [ ] `grafana/dashboards/cost-overview.json`:
  - [ ] Current month spend by resource
  - [ ] Projected month-end total
  - [ ] Budget vs. actual
  - [ ] Top cost drivers (tenants, users, resources)
  - [ ] Cost trends (daily, weekly)

### 6. Documentation
- [ ] Cost model specification
- [ ] Metering integration guide
- [ ] Budget configuration guide
- [ ] Cost optimization playbook

## Acceptance Criteria
- ✅ Synthetic load shows realistic cost projections
- ✅ Alert fires at 80% of configured budget
- ✅ Daily cost report generated and stored
- ✅ Reports accessible in CI artifacts or S3
- ✅ Grafana dashboard loads in < 2 seconds
- ✅ Metrics cardinality within limits (< 10,000 series)

## Cost Model Configuration

```yaml
# config/cost-model.yaml
version: '1.0'

# Unit costs (USD)
unitCosts:
  # API costs
  graphql_query: 0.000002      # $2 per 1M queries
  graphql_mutation: 0.000005   # $5 per 1M mutations

  # Ingest costs
  ingest_event: 0.0001         # $0.10 per 1k events
  ingest_file_mb: 0.01         # $0.01 per MB

  # Graph costs
  graph_1hop: 0.000001         # $1 per 1M 1-hop queries
  graph_2hop: 0.000005         # $5 per 1M 2-hop queries
  graph_3hop: 0.00001          # $10 per 1M 3-hop queries

  # Storage costs
  storage_gb_month: 0.05       # $0.05 per GB-month

  # Compute costs
  copilot_query: 0.10          # $0.10 per copilot query
  ml_inference: 0.01           # $0.01 per ML inference

# Budgets (USD)
budgets:
  development:
    monthly: 500
    alert_threshold: 0.80      # Alert at 80%

  staging:
    monthly: 1000
    alert_threshold: 0.80

  production:
    monthly: 10000
    alert_threshold: 0.80

# Anomaly detection
anomalyDetection:
  enabled: true
  threshold: 0.20              # Alert if >20% increase day-over-day
```

## Metering Middleware Example

```typescript
// libs/cost/src/middleware.ts
import { Request, Response, NextFunction } from 'express';
import { CostMeter } from './meter';

interface MeteringOptions {
  costModel: CostModel;
  dimensions?: Record<string, string | ((req: Request) => string)>;
}

export function meteringMiddleware(options: MeteringOptions) {
  const meter = new CostMeter(options.costModel);

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Extract dimensions
    const dimensions: Record<string, string> = {};
    for (const [key, value] of Object.entries(options.dimensions || {})) {
      dimensions[key] = typeof value === 'function' ? value(req) : value;
    }

    // Hook into response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      // Determine operation type
      const operation = req.body?.query?.includes('mutation')
        ? 'graphql_mutation'
        : 'graphql_query';

      // Record usage
      meter.record({
        operation,
        dimensions,
        timestamp: new Date(),
        metadata: {
          duration,
          statusCode: res.statusCode,
        },
      });
    });

    next();
  };
}
```

## Cost Calculation Engine

```typescript
// libs/cost/src/calculator.ts
import { CostModel, UsageEvent } from './types';

export class CostCalculator {
  constructor(private costModel: CostModel) {}

  calculate(event: UsageEvent): number {
    const unitCost = this.costModel.unitCosts[event.operation];
    if (!unitCost) {
      console.warn(`No unit cost defined for operation: ${event.operation}`);
      return 0;
    }

    // Apply multipliers if present
    const quantity = event.quantity ?? 1;
    const cost = unitCost * quantity;

    return cost;
  }

  aggregateCosts(events: UsageEvent[]): CostSummary {
    const summary: CostSummary = {
      total: 0,
      byOperation: {},
      byDimension: {},
    };

    for (const event of events) {
      const cost = this.calculate(event);
      summary.total += cost;

      // By operation
      summary.byOperation[event.operation] =
        (summary.byOperation[event.operation] || 0) + cost;

      // By dimension
      for (const [key, value] of Object.entries(event.dimensions || {})) {
        if (!summary.byDimension[key]) {
          summary.byDimension[key] = {};
        }
        summary.byDimension[key][value] =
          (summary.byDimension[key][value] || 0) + cost;
      }
    }

    return summary;
  }

  projectMonthlyCost(dailyAverage: number): number {
    const daysInMonth = 30; // Approximate
    return dailyAverage * daysInMonth;
  }
}
```

## Prometheus Metrics

```typescript
// libs/cost/src/prometheus.ts
import { register, Counter, Gauge } from 'prom-client';

export const costMetrics = {
  // Usage counters
  apiCalls: new Counter({
    name: 'api_calls_total',
    help: 'Total API calls',
    labelNames: ['tenant', 'user', 'operation'],
  }),

  ingestEvents: new Counter({
    name: 'ingest_events_total',
    help: 'Total ingested events',
    labelNames: ['connector', 'tenant'],
  }),

  // Cost gauges
  costUSD: new Gauge({
    name: 'cost_usd',
    help: 'Accumulated cost in USD',
    labelNames: ['dimension', 'resource'],
  }),

  budgetUtilization: new Gauge({
    name: 'budget_utilization_ratio',
    help: 'Budget utilization ratio (0-1)',
    labelNames: ['environment'],
  }),
};

register.registerMetric(costMetrics.apiCalls);
register.registerMetric(costMetrics.ingestEvents);
register.registerMetric(costMetrics.costUSD);
register.registerMetric(costMetrics.budgetUtilization);
```

## Daily Cost Report

```typescript
// services/cost-reporter/src/daily-report.ts
import { CostCalculator } from '@intelgraph/cost';
import { UsageRepository } from './repository';

export async function generateDailyReport(date: Date): Promise<CostReport> {
  const repo = new UsageRepository();
  const calculator = new CostCalculator(costModel);

  // Fetch usage events for the day
  const events = await repo.getEventsByDate(date);

  // Calculate costs
  const summary = calculator.aggregateCosts(events);

  // Project monthly cost
  const dailyAverage = summary.total;
  const projectedMonthly = calculator.projectMonthlyCost(dailyAverage);

  // Budget comparison
  const budget = costModel.budgets[process.env.ENVIRONMENT || 'development'];
  const budgetUtilization = projectedMonthly / budget.monthly;

  return {
    date,
    summary,
    projectedMonthly,
    budget: budget.monthly,
    budgetUtilization,
    anomalies: detectAnomalies(events),
  };
}
```

## Prometheus Alert Rules

```yaml
# prometheus/alerts/cost-alerts.yaml
groups:
  - name: cost_alerts
    interval: 1h
    rules:
      - alert: BudgetThreshold80Percent
        expr: budget_utilization_ratio > 0.80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Budget utilization > 80%"
          description: "Environment {{ $labels.environment }} at {{ $value | humanizePercentage }} of budget"

      - alert: BudgetThreshold100Percent
        expr: budget_utilization_ratio >= 1.0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Budget exceeded!"
          description: "Environment {{ $labels.environment }} exceeded budget"

      - alert: CostAnomaly
        expr: |
          (cost_usd - cost_usd offset 1d) / cost_usd offset 1d > 0.20
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Cost anomaly detected"
          description: "Cost increased by >20% compared to yesterday"
```

## Related Files
- `/home/user/summit/docs/cost-analysis/` - Cost analysis documents
- `/home/user/summit/libs/cost/` - Cost metering library (if exists)

## Usage with Claude Code

```bash
# Invoke this prompt directly
claude "Execute prompt 10: Cost guardrails implementation"

# Or use the slash command (if configured)
/cost-guardrails
```

## Notes
- Store usage events in TimescaleDB for efficient time-series queries
- Use Prometheus recording rules for daily/monthly aggregations
- Consider cost allocation by Kubernetes namespace/labels
- Implement quota enforcement at API gateway (e.g., rate limits)
- Export cost data to FinOps tools (CloudHealth, Kubecost, etc.)
