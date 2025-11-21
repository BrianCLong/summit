# Data Discovery & Fusion Engine

Automated data discovery and fusion engine for IntelGraph platform.

## Features

- **Automated Source Discovery**: Scans databases, APIs, files, S3, and Kafka for new data sources
- **Data Profiling**: Extracts metadata, detects PII, infers relationships, calculates quality scores
- **Entity Fusion**: Links and merges records from multiple sources using various strategies
- **Deduplication**: Identifies and removes duplicate records
- **Confidence Scoring**: Provides verifiable confidence scores with explanations
- **Context Persistence**: Learns from user feedback to improve fusion over time
- **Automation Recipes**: Pre-built workflows for common data operations

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/sources` | GET | List discovered sources |
| `/api/v1/sources/scan` | POST | Trigger manual scan |
| `/api/v1/profile/:sourceId` | POST | Profile a data source |
| `/api/v1/fuse` | POST | Fuse records |
| `/api/v1/deduplicate` | POST | Deduplicate records |
| `/api/v1/confidence/:fusionId` | GET | Get confidence report |
| `/api/v1/feedback` | POST | Submit feedback |
| `/api/v1/recipes` | GET | List automation recipes |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | 4100 | Server port |
| `SCAN_INTERVAL` | 60000 | Auto-scan interval (ms) |
| `AUTO_INGEST_THRESHOLD` | 0.8 | Min confidence for auto-ingest |
| `AUTO_DISCOVERY` | true | Enable auto-discovery |
| `ENABLE_LEARNING` | true | Enable learning from feedback |

## Usage

```bash
pnpm install
pnpm dev
```

## Architecture

```
src/
├── scanner/       # Automated source discovery
├── profiler/      # Data profiling and classification
├── fusion/        # Entity fusion and deduplication
├── confidence/    # Confidence scoring
├── context/       # Learning and context persistence
├── api/           # REST API routes
└── index.ts       # Main entry point
```
