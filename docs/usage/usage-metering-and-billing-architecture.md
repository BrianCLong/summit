# Usage Metering and Billing Architecture

This document describes the usage metering, quota enforcement, and billing system for Summit.

## Core Concepts

### Usage Event
A `UsageEvent` represents a single unit of work that needs to be tracked.
- **Kind**: The type of usage (e.g., `llm.tokens`, `maestro.runs`, `external_api.requests`).
- **Quantity**: The amount consumed.
- **TenantId**: The tenant responsible for the usage.

### Plan
A `Plan` defines the limits and pricing for a set of usage kinds.
- **Limits**: `monthlyIncluded`, `hardCap`, `unitPrice`.
- **Features**: Feature flags enabled for the plan.

### Services
- **UsageMeteringService**: Records events to the `usage_events` table.
- **QuotaService**: Checks if a tenant has sufficient quota before an operation proceeds.
- **PricingEngine**: Calculates costs and generates invoices.

## Data Model

The system uses PostgreSQL for persistence.

- `usage_events`: Raw log of all metered events.
- `plans`: Definitions of available plans.
- `tenant_plans`: Assignment of plans to tenants.
- `usage_summaries`: Aggregated view of usage (typically daily/monthly).
- `invoices`: Generated billing records.

## Integration Points

### API
Use the `usageMiddleware` in `server/src/middleware/usage.ts` to automatically meter and rate-limit API routes.

```typescript
import { usageMiddleware } from '../middleware/usage';
app.use('/api/v1/resource', usageMiddleware, resourceRouter);
```

### LLM / Maestro
Maestro's `CostMeter` automatically records `llm.tokens` usage when LLM tasks are executed.

### Direct Usage
To meter custom events:

```typescript
import UsageMeteringService from '../services/UsageMeteringService';

await UsageMeteringService.record({
  tenantId: 'tenant-123',
  kind: 'custom.metric',
  quantity: 1,
  unit: 'count'
});
```

## Observability

Prometheus metrics are exposed via the standard metrics endpoint:
- `summit_usage:events_recorded_total`: Counter of recorded events by kind.
- `summit_quota:checks_total`: Counter of quota checks by kind and result.

## Events

The system logs key lifecycle events which can be hooked into for automation:
- `usage.quota.near_limit`: Logged when a soft threshold is crossed.
- `usage.quota.exceeded`: Logged when a hard cap is hit.
