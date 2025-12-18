# Data Discovery & Fusion Engine

Automated data discovery and fusion engine for the IntelGraph platform. Provides autonomous data source scanning, profiling, entity fusion, and intelligent deduplication with confidence scoring and learning from feedback.

## Features

### Core Capabilities

- **Automated Source Discovery**: Scans databases, APIs, files, S3, and Kafka for new data sources without explicit human direction
- **Data Profiling**: Extracts metadata, detects PII, infers relationships, calculates quality scores across 6 dimensions
- **Entity Fusion**: Links and merges records from multiple sources using configurable strategies
- **Deduplication**: Identifies and removes duplicate records with similarity scoring
- **Confidence Scoring**: Provides verifiable confidence scores with explanations and recommendations
- **Context Persistence**: Learns from user feedback to improve fusion accuracy over time
- **Event Streaming**: Publishes events to Redis Streams for integration with other services

### Fusion Strategies

| Strategy | Description |
|----------|-------------|
| `exact_match` | Exact string matching |
| `fuzzy_match` | Jaro-Winkler similarity (default) |
| `semantic_similarity` | Embedding-based similarity |
| `rule_based` | Learned fusion rules |
| `ml_based` | Machine learning model |

### Data Quality Dimensions

- Completeness
- Accuracy
- Consistency
- Timeliness
- Validity
- Uniqueness

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check with stats |
| `/api/v1/sources` | GET | List discovered sources |
| `/api/v1/sources` | POST | Add scan endpoint |
| `/api/v1/sources/scan` | POST | Trigger manual scan |
| `/api/v1/profile/:sourceId` | GET | Get source profile |
| `/api/v1/profile/:sourceId` | POST | Profile a data source |
| `/api/v1/profile/:sourceId/report` | GET | Get markdown profile report |
| `/api/v1/fuse` | POST | Fuse records |
| `/api/v1/deduplicate` | POST | Deduplicate records |
| `/api/v1/fusion/:id` | GET | Get fusion result |
| `/api/v1/confidence/:fusionId` | GET | Get confidence report |
| `/api/v1/confidence/:fusionId/visualization` | GET | Get visualization data |
| `/api/v1/feedback` | POST | Submit feedback |
| `/api/v1/feedback/:fusionId` | GET | Get feedback for fusion |
| `/api/v1/learning/stats` | GET | Get learning statistics |
| `/api/v1/learning/context/:sourceId` | GET | Get learning context |
| `/api/v1/recipes` | GET | List automation recipes |
| `/api/v1/recipes/execute/:recipeId` | POST | Execute automation recipe |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | 4100 | Server port |
| `SCAN_INTERVAL` | 60000 | Auto-scan interval (ms) |
| `AUTO_INGEST_THRESHOLD` | 0.8 | Min confidence for auto-ingest |
| `AUTO_DISCOVERY` | true | Enable auto-discovery |
| `ENABLE_LEARNING` | true | Enable learning from feedback |
| `ENABLE_EVENTS` | true | Enable Redis event publishing |
| `REDIS_URL` | redis://localhost:6379 | Redis connection URL |

## Quick Start

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Production build
pnpm build
pnpm start

# Run tests
pnpm test
```

## Docker

```bash
# Build image
docker build -t data-discovery-fusion .

# Run container
docker run -p 4100:4100 \
  -e REDIS_URL=redis://redis:6379 \
  data-discovery-fusion
```

## Usage Examples

### Fuse Records

```bash
curl -X POST http://localhost:4100/api/v1/fuse \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {"sourceId": "db1", "recordId": "1", "data": {"name": "John Doe", "email": "john@example.com"}},
      {"sourceId": "api1", "recordId": "2", "data": {"name": "John Doe", "phone": "555-1234"}}
    ],
    "matchFields": ["name"],
    "strategy": "fuzzy_match"
  }'
```

### Get Confidence Report

```bash
curl http://localhost:4100/api/v1/confidence/<fusion-id>
```

### Submit Feedback

```bash
curl -X POST http://localhost:4100/api/v1/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user1",
    "fusionId": "<fusion-id>",
    "feedbackType": "correct"
  }'
```

## Architecture

```
src/
├── scanner/           # Automated source discovery
│   └── SourceScanner.ts
├── profiler/          # Data profiling and classification
│   └── DataProfiler.ts
├── fusion/            # Entity fusion and deduplication
│   └── FusionEngine.ts
├── confidence/        # Confidence scoring
│   └── ConfidenceScorer.ts
├── context/           # Learning and context persistence
│   └── ContextPersistence.ts
├── events/            # Redis event streaming
│   └── EventPublisher.ts
├── api/               # REST API routes
│   └── routes.ts
├── utils/             # Utilities (logging, etc.)
├── types.ts           # TypeScript type definitions
├── DataDiscoveryFusionEngine.ts  # Main orchestrator
└── index.ts           # Entry point
```

## Event Types

Events published to Redis Streams:

- `source_discovered` - New data source found
- `source_profiled` - Source profiling completed
- `fusion_completed` - Records fused
- `dedup_completed` - Deduplication completed
- `feedback_received` - User feedback recorded
- `error_occurred` - Error during processing

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test:watch
```

## Integration

The service integrates with the IntelGraph platform through:

1. **Redis Streams**: Publishes events for consumption by other services
2. **REST API**: Provides endpoints for fusion, profiling, and feedback
3. **Shared Types**: Uses common types from `@intelgraph/common-types`

## License

Proprietary - IntelGraph Platform
