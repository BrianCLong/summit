# Time-Series Metrics Storage Platform

> **Observability Time-Series Platform v1.0** for CompanyOS

A robust, cost-aware metrics platform that answers "what happened over time?" for any key signal. This service provides the storage and querying layer for all time-series observability data: metrics, high-volume events, and derived signals that power SLOs, alerts, and analytics.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Storage Tiers](#storage-tiers)
- [Query API](#query-api)
- [SLO Management](#slo-management)
- [Multi-Tenant Support](#multi-tenant-support)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)

## Overview

### Key Features

- **Multi-Tier Storage**: Hot/Warm/Cold tiers with automatic data movement
- **PromQL-Compatible Queries**: Familiar query syntax for metrics exploration
- **SLO Calculator**: Built-in error budget and burn rate calculations
- **Multi-Tenant Isolation**: Per-tenant quotas, rate limits, and resource isolation
- **High-Throughput Ingestion**: Batched writes with Kafka support
- **Automatic Downsampling**: Configurable retention and rollup policies

### Metric Types Supported

| Type | Description | Use Case |
|------|-------------|----------|
| **Counter** | Monotonically increasing value | Total requests, errors, events |
| **Gauge** | Value that can go up or down | Active connections, memory usage |
| **Histogram** | Distribution of values in buckets | Latencies, response times |
| **Summary** | Client-side calculated quantiles | Streaming percentiles |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Time-Series Metrics Platform                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  HTTP API    │    │   Kafka      │    │  Prometheus  │       │
│  │  /api/v1/*   │    │  Consumer    │    │  Remote Write│       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         └───────────────────┴───────────────────┘                │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │   Ingestion     │                          │
│                    │   Pipeline      │                          │
│                    │  (Validation,   │                          │
│                    │   Batching)     │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │                │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐         │
│  │  HOT TIER   │    │  WARM TIER  │    │  COLD TIER  │         │
│  │ TimescaleDB │───▶│ TimescaleDB │───▶│  Parquet/S3 │         │
│  │   (15s)     │    │    (1m)     │    │    (1h)     │         │
│  │   7 days    │    │   30 days   │    │  365 days   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │  Query Engine   │                          │
│                    │  (PromQL-like)  │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
│                    ┌────────▼────────┐                          │
│                    │  SLO Calculator │                          │
│                    │  (Error Budget, │                          │
│                    │   Burn Rate)    │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Model

### Label/Tag Strategy

Standard labels for multi-tenant metrics:

| Label | Description | Cardinality Limit |
|-------|-------------|-------------------|
| `service` | Service name | 500 |
| `tenant` | Tenant identifier | 10,000 |
| `region` | Deployment region | 50 |
| `environment` | dev/staging/prod | 10 |
| `version` | Service version | 100 |
| `instance` | Instance ID | 1,000 |
| `method` | HTTP method | 10 |
| `path` | Request path | 500 |
| `status` | Response status | 10 |
| `feature` | Feature flag | 200 |

### Metric Naming Conventions

```
<namespace>_<subsystem>_<name>_<unit>

Examples:
- http_requests_total
- http_request_duration_seconds
- db_connections_active
- cache_hits_total
- slo_error_budget_remaining_ratio
```

## Storage Tiers

### Hot Tier (7 days)
- **Resolution**: 15 seconds
- **Backend**: TimescaleDB
- **Use Case**: Real-time dashboards, alerts, recent investigations
- **Compression**: LZ4 after 1 day

### Warm Tier (30 days)
- **Resolution**: 1 minute (downsampled)
- **Backend**: TimescaleDB
- **Use Case**: Weekly/monthly trends, capacity planning
- **Aggregations**: avg, min, max, sum, count

### Cold Tier (365 days)
- **Resolution**: 1 hour (highly aggregated)
- **Backend**: Object Storage (S3/Parquet)
- **Use Case**: Long-term trends, compliance, historical analysis
- **Aggregations**: avg, min, max, sum, count, p50, p95, p99

### Retention Policies

| Policy | Hot | Warm | Cold | Delete After |
|--------|-----|------|------|--------------|
| default | 7d @ 15s | 30d @ 1m | 365d @ 1h | 2 years |
| slo-metrics | 14d @ 10s | 90d @ 1m | 3y @ 5m | Never |
| business-metrics | 30d @ 1m | 365d @ 15m | 5y @ 1h | Never |
| infrastructure | 3d @ 15s | 14d @ 1m | 90d @ 5m | 180 days |

## Query API

### Instant Query

```bash
GET /api/v1/query?query=http_requests_total{service="api"}&time=1702000000
```

### Range Query

```bash
GET /api/v1/query_range?query=rate(http_requests_total[5m])&start=1702000000&end=1702086400&step=60
```

### Supported Functions

- **Rate functions**: `rate()`, `irate()`, `increase()`, `delta()`
- **Aggregations**: `sum()`, `avg()`, `min()`, `max()`, `count()`
- **Math**: `abs()`, `ceil()`, `floor()`, `round()`
- **Histograms**: `histogram_quantile()`

## SLO Management

### Defining an SLO

```bash
POST /api/v1/slos
Content-Type: application/json

{
  "id": "api-availability",
  "name": "API Availability",
  "type": "availability",
  "service": "api-gateway",
  "target": 99.9,
  "windowType": "rolling",
  "windowDuration": "30d",
  "sliQuery": {
    "good": "sum(rate(http_requests_total{status!~\"5..\"}[5m]))",
    "total": "sum(rate(http_requests_total[5m]))"
  },
  "burnRateAlerts": [
    {"severity": "critical", "shortWindow": "5m", "longWindow": "1h", "burnRateThreshold": 14.4},
    {"severity": "warning", "shortWindow": "2h", "longWindow": "1d", "burnRateThreshold": 3}
  ]
}
```

### Checking SLO Status

```bash
GET /api/v1/slos/api-availability/status

{
  "sloId": "api-availability",
  "currentSLI": 99.95,
  "targetSLI": 99.9,
  "isMet": true,
  "errorBudgetRemaining": 50.0,
  "burnRate": 0.5,
  "timeToExhaustion": null,
  "triggeredAlerts": []
}
```

## Multi-Tenant Support

### Tenant Tiers

| Tier | Ingestion Rate | Active Series | Query Timeout | Storage |
|------|----------------|---------------|---------------|---------|
| Free | 1K/s | 10K | 30s | 1 GB |
| Starter | 10K/s | 100K | 60s | 10 GB |
| Professional | 100K/s | 1M | 120s | 100 GB |
| Enterprise | 1M/s | 10M | 300s | 1 TB |

### Resource Isolation

- Per-tenant query queues with priority
- Rate limiting on ingestion
- Storage quotas
- Label cardinality limits

## Getting Started

### Prerequisites

- Node.js >= 18.18
- PostgreSQL 15+ with TimescaleDB extension
- Redis (optional, for caching)
- Kafka (optional, for high-throughput ingestion)

### Installation

```bash
cd services/timeseries-metrics
pnpm install
```

### Database Setup

```bash
# Run migrations
psql -d timeseries_metrics -f migrations/001_timeseries_schema.sql
```

### Running the Service

```bash
# Development
pnpm dev

# Production
pnpm build && pnpm start
```

### Environment Variables

```bash
# Server
TIMESERIES_PORT=8090
TIMESERIES_HOST=0.0.0.0

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=timeseries_metrics
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka (optional)
KAFKA_ENABLED=false
KAFKA_BROKERS=localhost:9092

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## API Reference

### Write Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/write` | POST | Write metrics (Prometheus remote write compatible) |

### Query Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/query` | GET | Instant query |
| `/api/v1/query_range` | GET | Range query |
| `/api/v1/series` | GET | Series metadata |
| `/api/v1/labels` | GET | Label names |
| `/api/v1/label/:name/values` | GET | Label values |

### SLO Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/slos` | GET | List SLOs |
| `/api/v1/slos` | POST | Create SLO |
| `/api/v1/slos/:id/status` | GET | Get SLO status |
| `/api/v1/slos/:id/history` | GET | Get SLO history |
| `/api/v1/slos/:id` | DELETE | Delete SLO |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/admin/storage/stats` | GET | Storage statistics |
| `/api/v1/admin/storage/downsample` | POST | Trigger downsampling |
| `/api/v1/admin/storage/cleanup` | POST | Trigger retention cleanup |
| `/api/v1/admin/tenants` | POST | Register tenant |
| `/api/v1/admin/ingestion/flush` | POST | Flush ingestion buffers |

### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/health/ready` | GET | Readiness check |
| `/metrics` | GET | Prometheus metrics |

## Integration with Observability Stack

This service integrates with the existing CompanyOS observability infrastructure:

- **Prometheus**: Compatible remote write API, scrape endpoint at `/metrics`
- **Grafana**: Use as Prometheus data source
- **AlertManager**: SLO burn rate alerts
- **OpenTelemetry**: Metrics receiver support

## License

Internal use only - CompanyOS Platform
