# Signal Bus Service

Real-time signal ingestion, validation, enrichment, and routing service for the IntelGraph platform.

## Overview

The Signal Bus Service is the core streaming pipeline component that:

1. **Ingests** continuous sensor/signal feeds from various connectors
2. **Validates** signals against schema definitions
3. **Normalizes** data for consistent processing
4. **Enriches** with GeoIP, device lookup, and custom enrichers
5. **Evaluates** rules to generate alerts (thresholds, patterns, temporal logic)
6. **Routes** signals and alerts to downstream services (Graph, Spacetime, Case, Analytics)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Signal Bus Service                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐│
│  │ Validate │ → │Normalize │ → │ Enrich   │ → │ Evaluate │ → │ Route  ││
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └────────┘│
│       ↑                              ↑              ↑             ↓     │
│  ┌──────────┐                  ┌──────────┐   ┌──────────┐  ┌────────┐ │
│  │Connectors│                  │ GeoIP    │   │  Rules   │  │ Kafka  │ │
│  │ (HTTP,   │                  │ Device   │   │  Store   │  │Producer│ │
│  │ Polling) │                  └──────────┘   └──────────┘  └────────┘ │
│  └──────────┘                                                           │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                     Backpressure Handler                             ││
│  │  • Bounded queues with high/low water marks                          ││
│  │  • Spill-to-disk when queue fills                                    ││
│  │  • Lag metrics per stream/tenant                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Start in development mode
pnpm dev

# Run tests
pnpm test
```

## Configuration

Configuration is loaded from environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3100` |
| `KAFKA_BROKERS` | Comma-separated Kafka brokers | `localhost:9092` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `LOG_LEVEL` | Logging level | `info` |

See `src/config.ts` for full configuration options.

## API Endpoints

### Health

- `GET /health` - Overall health status
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check
- `GET /health/detailed` - Detailed health with metrics

### Signals

- `POST /api/v1/signals` - Ingest a single signal
- `POST /api/v1/signals/batch` - Ingest multiple signals

### Rules

- `GET /api/v1/rules` - List all rules
- `POST /api/v1/rules` - Add a rule
- `DELETE /api/v1/rules/:ruleId` - Delete a rule

### Metrics

- `GET /metrics` - Prometheus metrics

## Signal Types

The service supports all signal types defined in `@intelgraph/signal-contracts`:

- **Sensor**: geolocation, biometric, environmental, motion, proximity, RFID, acoustic, optical
- **Telemetry**: device status, network activity, resource usage, heartbeat, battery
- **Communications**: message, call, email, social media, radio
- **Log**: access, audit, security, application, system
- **Alert**: threshold, pattern, anomaly, correlation

## Rule Types

### Threshold Rules
Trigger when a value crosses a threshold.

```typescript
{
  ruleType: 'threshold',
  config: {
    condition: {
      type: 'simple',
      field: 'payload.temperature',
      operator: 'gt',
      value: 100
    }
  }
}
```

### Pattern Rules
Trigger when a sequence of events matches.

```typescript
{
  ruleType: 'pattern',
  config: {
    sequence: [
      { name: 'event1', condition: {...} },
      { name: 'event2', condition: {...} }
    ],
    withinMs: 60000
  }
}
```

### Rate Rules
Trigger based on event frequency.

```typescript
{
  ruleType: 'rate',
  config: {
    rateThreshold: 100,
    windowMs: 60000,
    triggerOnHigh: true
  }
}
```

### Absence Rules
Trigger when expected signals are missing.

```typescript
{
  ruleType: 'absence',
  config: {
    maxGapMs: 300000,
    monitorField: 'device.deviceId'
  }
}
```

## Downstream Integration

The service emits events to downstream services without writing directly to their databases:

- **Graph Core**: Entity and relationship suggestions
- **Spacetime**: Temporal events and tracks
- **Case Service**: Task suggestions, watchlist hits, alert notifications
- **Analytics**: Metrics and aggregations

## Resilience Features

### Backpressure Handling
- Bounded in-memory queues with configurable limits
- Automatic pause/resume of consumers at water marks
- Spill-to-disk when queue fills (configurable)

### Exactly-Once Semantics
- Idempotent downstream contracts with idempotency keys
- At-least-once delivery with deduplication

### Fault Tolerance
- Automatic retry with exponential backoff
- Dead letter queue for failed signals
- Graceful shutdown with in-flight processing completion

## Development

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Test with coverage
pnpm test:coverage
```

## Dependencies

- `@intelgraph/signal-contracts` - Signal schema definitions
- `@intelgraph/kafka-integration` - Kafka abstractions
- `express` - HTTP server
- `pino` - Structured logging
- `zod` - Schema validation
- `ioredis` - Redis client
- `lru-cache` - In-memory caching

## License

UNLICENSED - IntelGraph Team
