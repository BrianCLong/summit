# Streaming Ingest Service

Event sourcing streaming ingest service with schema validation, append-only event store, deterministic replay, and comprehensive provenance tracking.

## Features

- **Schema Validation**: Zod-based validation at the edge
- **Append-Only Event Store**: PostgreSQL-based immutable event log
- **Deterministic Replay**: Replay events from checkpoints with full reproducibility
- **Provenance Tracking**: Per-event hash, source, policy tags, and transformation chain
- **High Throughput**: Batch processing mode for 10k+ msgs/sec
- **Disaster Recovery**: Checkpoint-based recovery with integrity verification

## Quick Start

```bash
# Install dependencies
pnpm install

# Start service (development)
pnpm dev

# Build
pnpm build

# Start service (production)
pnpm start
```

## Configuration

See `.env.example` for all configuration options.

Key environment variables:

- `KAFKA_BROKERS`: Comma-separated Kafka broker addresses (default: `kafka:9092`)
- `KAFKA_TOPICS`: Topics to consume (default: `events`)
- `DATABASE_URL`: PostgreSQL connection string
- `BATCH_MODE`: Enable batch processing (default: `false`)
- `BATCH_SIZE`: Events per batch (default: `100`)

## Docker Deployment

```bash
# Build image
docker build -t streaming-ingest .

# Run with docker-compose
docker-compose -f docker-compose.streaming.yml up
```

## CLI Usage

### Replay from Checkpoint

```bash
pnpm replay from-checkpoint \
  --checkpoint-id <uuid> \
  --topic events \
  --target-topic events-replay \
  --event-types entity.created,entity.updated
```

### Replay from Offset Range

```bash
pnpm replay from-offset \
  --from-offset 1000 \
  --to-offset 2000 \
  --topic events \
  --sources intelligence-platform,copilot-service
```

### Create Checkpoint

```bash
pnpm replay create-checkpoint \
  --topic events \
  --partition 0 \
  --offset 5000
```

### Get Checkpoint Details

```bash
pnpm replay get-checkpoint \
  --checkpoint-id <uuid>
```

## API Endpoints

### Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (includes database connectivity)

### Replay Operations

- `POST /replay` - Trigger event replay
  ```json
  {
    "checkpointId": "uuid",
    "topic": "events",
    "targetTopic": "events-replay",
    "filters": {
      "eventTypes": ["entity.created"],
      "sources": ["intelligence-platform"],
      "tenantIds": ["tenant-001"]
    }
  }
  ```

- `POST /checkpoint` - Create checkpoint
  ```json
  {
    "topic": "events",
    "partition": 0,
    "offset": "5000"
  }
  ```

- `GET /checkpoint/:id` - Get checkpoint details

### Metrics

- `GET /metrics` - Service metrics (TODO: Prometheus integration)

## Event Schema

All events follow this structure:

```typescript
{
  id: string;              // UUID
  type: string;            // Event type (e.g., "entity.created")
  source: string;          // Source system
  timestamp: number;       // Unix timestamp (ms)
  data: object;            // Event payload
  metadata: {
    version: string;
    correlationId?: string;
    causationId?: string;
    userId?: string;
    tenantId?: string;
  };
  provenance: {
    hash: string;                    // Content hash (SHA-256)
    signature?: string;              // Optional signature
    policyTags: string[];            // Policy tags (PII, SENSITIVE, etc.)
    classification: string;          // UNCLASSIFIED | CONFIDENTIAL | SECRET | TOP_SECRET
    source: string;                  // Origin system
    ingestionTime: number;           // Ingestion timestamp
    transformations: Array<{         // Transformation chain
      operation: string;
      timestamp: number;
      userId?: string;
    }>;
  };
}
```

## Load Testing

Test the service at 10k events/sec:

```bash
# Set environment variables
export KAFKA_BROKERS=localhost:9092
export KAFKA_TOPIC=events
export TARGET_THROUGHPUT=10000
export DURATION=60
export BATCH_SIZE=100

# Run load test
tsx test/load-test.ts
```

## Disaster Recovery

### Create Checkpoint

```bash
pnpm replay create-checkpoint \
  --topic events \
  --partition 0 \
  --offset $(kafka-console-consumer --bootstrap-server localhost:9092 --topic events --property print.offset=true | tail -1 | awk '{print $1}')
```

### Replay from Last Known Good State

```bash
# Get latest checkpoint
CHECKPOINT_ID=$(curl http://localhost:8080/checkpoints/latest | jq -r '.id')

# Replay from checkpoint
pnpm replay from-checkpoint \
  --checkpoint-id $CHECKPOINT_ID \
  --topic events \
  --target-topic events-recovered
```

## Architecture

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   Kafka     │──────▶│  Event Consumer  │──────▶│   Event     │
│   Topics    │       │  (Schema Valid.) │       │   Store     │
└─────────────┘       └──────────────────┘       │ (Postgres)  │
                              │                   └─────────────┘
                              │ Provenance
                              │ Enrichment
                              ▼
                      ┌──────────────────┐
                      │   Provenance     │
                      │   Tracker        │
                      │ (Hash, Tags, etc)│
                      └──────────────────┘

Replay Flow:
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│  Checkpoint │──────▶│  Replay Service  │──────▶│    Kafka    │
│   Store     │       │  (Deterministic) │       │   Producer  │
└─────────────┘       └──────────────────┘       └─────────────┘
```

## Truth Over Time Guarantees

1. **Immutability**: Events are never updated or deleted
2. **Determinism**: Replays produce identical results given same inputs
3. **Integrity**: Checksums and hashes verify data integrity
4. **Provenance**: Full chain-of-custody for all events
5. **Auditability**: Complete history with timestamps and user attribution

## Development

```bash
# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Watch mode
pnpm dev
```

## License

Proprietary - IntelGraph Platform
