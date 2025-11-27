# Privacy-Preserving Analytics Service

A production-ready analytics service for IntelGraph that provides aggregation and statistical queries with strong privacy guarantees through differential privacy, k-anonymity, and configurable suppression rules.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Privacy Mechanisms](#privacy-mechanisms)
- [Configuration](#configuration)
- [Testing](#testing)
- [Security Considerations](#security-considerations)

## Overview

The Privacy-Preserving Analytics Service enables secure aggregate analytics over sensitive intelligence data while protecting individual privacy. It implements mathematically rigorous privacy mechanisms that provide quantifiable privacy guarantees.

### Key Capabilities

- **Aggregate Queries**: Count, sum, average, min/max, median, percentiles, variance
- **Differential Privacy**: Laplace, Gaussian, and Exponential mechanisms with budget tracking
- **K-Anonymity**: Cohort size thresholds with configurable violation handling
- **Policy Enforcement**: Governance-integrated privacy policies per tenant/use-case
- **Predefined Metrics**: Safe-by-design metrics for dashboards with embedded policies

## Features

### Privacy Guarantees

| Mechanism | Description | When to Use |
|-----------|-------------|-------------|
| **Differential Privacy** | Adds calibrated noise to query results | Numeric aggregations, high-sensitivity data |
| **K-Anonymity** | Suppresses cohorts smaller than k | Dimension-based queries, re-identification risk |
| **Suppression** | Removes results below count thresholds | Low-count filtering, cell suppression |
| **Generalization** | Rolls up values to higher hierarchies | Location, age, categorical data |

### Budget Management

- Per-tenant and per-user privacy budget tracking
- Configurable renewal periods (hour, day, week, month)
- Advanced composition bounds for query sequences
- Automatic budget enforcement with clear denial messages

### Governance Integration

- Integration with OPA (Open Policy Agent) for authorization
- Privacy profiles per tenant/use-case
- Policy-based query modifications
- Comprehensive audit logging

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Privacy Analytics Service                    │
├─────────────────────────────────────────────────────────────────┤
│  REST API Layer                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │/aggregate│  │ /metrics │  │ /budget  │  │ /audit           │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
│       │             │             │                  │           │
├───────┼─────────────┼─────────────┼──────────────────┼───────────┤
│  ┌────▼─────────────▼─────────────▼──────────────────▼────────┐  │
│  │                    Query Executor                          │  │
│  │  - Validates queries                                       │  │
│  │  - Executes against backends                               │  │
│  │  - Orchestrates privacy enforcement                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│       ┌──────────────────────┼──────────────────────┐            │
│       ▼                      ▼                      ▼            │
│  ┌─────────┐          ┌─────────────┐        ┌─────────────┐    │
│  │ Query   │          │ Policy      │        │Differential │    │
│  │Translator│         │ Enforcer    │        │ Privacy     │    │
│  │         │          │             │        │             │    │
│  │PostgreSQL│         │K-Anonymity  │        │Laplace      │    │
│  │Cypher   │          │Suppression  │        │Gaussian     │    │
│  │         │          │Generalization│       │Budget Track │    │
│  └────┬────┘          └──────┬──────┘        └──────┬──────┘    │
│       │                      │                      │            │
├───────┼──────────────────────┼──────────────────────┼────────────┤
│       ▼                      ▼                      ▼            │
│  ┌─────────┐          ┌─────────────┐        ┌─────────────┐    │
│  │PostgreSQL│         │ Governance  │        │   Redis     │    │
│  │Neo4j    │          │ Service/OPA │        │   Cache     │    │
│  └─────────┘          └─────────────┘        └─────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18.18
- PostgreSQL >= 15
- Redis (optional, for caching)
- Neo4j (optional, for graph queries)

### Installation

```bash
cd services/privacy-analytics-service
pnpm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### Run Development Server

```bash
pnpm dev
```

### Run Tests

```bash
pnpm test
```

### Build for Production

```bash
pnpm build
pnpm start
```

## API Reference

### POST /api/v1/aggregate

Execute a privacy-preserving aggregate query.

**Headers:**
- `X-Tenant-ID` (required): Tenant identifier
- `X-User-ID`: User identifier
- `X-User-Roles`: Comma-separated roles
- `Authorization`: Bearer token

**Request Body:**
```json
{
  "source": "entities",
  "dimensions": [
    { "field": "type" }
  ],
  "measures": [
    { "field": "id", "aggregation": "count", "alias": "count" }
  ],
  "filters": {
    "logic": "AND",
    "conditions": [
      { "field": "status", "operator": "eq", "value": "active" }
    ]
  },
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  },
  "limit": 100
}
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "dimensions": { "type": "person" },
      "measures": { "count": 1234 },
      "privacyAffected": true,
      "cohortSize": 1234
    }
  ],
  "totalCount": 5,
  "filteredCount": 4,
  "suppressedCount": 1,
  "privacyMechanism": "combined",
  "warnings": [
    {
      "code": "DP_NOISE_APPLIED",
      "message": "Differential privacy noise applied (ε=1.0)",
      "severity": "info"
    }
  ],
  "budgetConsumed": { "epsilon": 0.5 },
  "budgetRemaining": { "epsilon": 9.5, "queriesRemaining": 19 },
  "metadata": {
    "executionId": "abc-123",
    "executionTimeMs": 45,
    "policiesApplied": ["default-kanon", "default-dp"],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### GET /api/v1/metrics

List available predefined metrics.

**Response:**
```json
{
  "metrics": [
    {
      "id": "entity-count-by-type",
      "name": "Entity Count by Type",
      "description": "Total count of entities grouped by type",
      "category": "operational",
      "refreshInterval": 300,
      "requiredRoles": ["user", "analyst", "admin"]
    }
  ],
  "total": 10
}
```

### GET /api/v1/metrics/:id

Execute a predefined metric.

**Response:**
```json
{
  "metric": {
    "id": "entity-count-by-type",
    "name": "Entity Count by Type"
  },
  "result": { /* AggregateResult */ },
  "cached": false
}
```

### GET /api/v1/budget

Get current privacy budget status.

**Response:**
```json
{
  "tenantId": "tenant-123",
  "userId": "user-456",
  "budget": {
    "total": 10.0,
    "spent": 2.5,
    "remaining": 7.5,
    "utilizationPercent": "25.00"
  },
  "queries": { "count": 5 },
  "period": {
    "start": "2024-01-15T00:00:00Z",
    "end": "2024-01-16T00:00:00Z"
  }
}
```

### GET /api/v1/audit

Get privacy audit log (admin/security roles only).

**Query Parameters:**
- `limit`: Maximum records (default: 100, max: 1000)
- `tenantId`: Filter by tenant (admin only)

## Privacy Mechanisms

### Differential Privacy

The service implements (ε, δ)-differential privacy using:

- **Laplace Mechanism**: For pure ε-DP, adds noise from Laplace(sensitivity/ε)
- **Gaussian Mechanism**: For approximate (ε, δ)-DP, adds Gaussian noise
- **Exponential Mechanism**: For categorical selection queries

**Budget Tracking:**

Privacy budget is tracked per tenant/user with configurable renewal periods. When budget is exhausted, queries are denied until the next period.

```
Total Privacy = Σ(per-query ε) ≤ Budget ε
```

### K-Anonymity

Ensures that each combination of quasi-identifiers appears at least k times:

- Cohort size validation
- Configurable quasi-identifier fields
- Violation actions: suppress, generalize, or error

### Suppression

Removes or masks results below configurable thresholds:

- Minimum count threshold
- Show/hide suppressed rows
- Configurable placeholder values

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3020 |
| `DEFAULT_MIN_COHORT_SIZE` | K-anonymity k value | 5 |
| `DEFAULT_EPSILON` | DP epsilon budget | 1.0 |
| `ENABLE_DIFFERENTIAL_PRIVACY` | Enable DP | true |
| `ENABLE_K_ANONYMITY` | Enable k-anonymity | true |
| `POSTGRES_HOST` | PostgreSQL host | localhost |
| `NEO4J_URI` | Neo4j connection URI | bolt://localhost:7687 |
| `GOVERNANCE_SERVICE_URL` | Governance service | http://localhost:3015 |
| `OPA_ENDPOINT` | OPA endpoint | http://localhost:8181 |

See `.env.example` for full configuration options.

### Privacy Policy Configuration

Policies can be configured per tenant through the governance service or using default policies:

```typescript
const policy: PrivacyPolicy = {
  id: 'custom-policy',
  name: 'Custom Privacy Policy',
  enabled: true,
  mechanism: 'combined',
  kAnonymity: {
    minCohortSize: 10,
    quasiIdentifiers: ['zip_code', 'age', 'gender'],
    violationAction: 'suppress'
  },
  differentialPrivacy: {
    epsilon: 0.5,
    mechanism: 'laplace',
    budgetTracking: true,
    budgetRenewalPeriod: 'day'
  },
  applicableSources: ['entities', 'cases'],
  priority: 100
};
```

## Testing

### Unit Tests

```bash
pnpm test
```

### Coverage Report

```bash
pnpm test:coverage
```

### Security Tests

The test suite includes comprehensive security tests for:

- Differencing attacks
- Linkage attacks
- Reconstruction attacks
- Membership inference
- SQL injection prevention

## Security Considerations

### Privacy Guarantees and Limitations

1. **Differential Privacy is not perfect anonymization**: It provides mathematically quantifiable privacy loss (ε), not absolute privacy.

2. **k-Anonymity alone is insufficient**: Should be combined with DP for sensitive data.

3. **Budget exhaustion**: Users may be denied queries when budget is exhausted. Plan accordingly.

4. **Auxiliary information**: External knowledge can potentially be combined with query results.

### Honest Tradeoffs

| Higher Privacy (lower ε) | Lower Privacy (higher ε) |
|--------------------------|--------------------------|
| More noise in results | More accurate results |
| Fewer queries allowed | More queries allowed |
| Better individual protection | Better utility |

### Recommendations

1. Set ε ≤ 1.0 for highly sensitive data
2. Use k ≥ 5 for k-anonymity (k ≥ 10 for sensitive attributes)
3. Monitor budget usage to detect potential attacks
4. Review audit logs regularly
5. Combine multiple mechanisms for defense-in-depth

## License

Copyright © 2024 IntelGraph. All rights reserved.
