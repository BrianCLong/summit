# Media Pipeline Service

Media and communications pipeline service for the IntelGraph platform. Handles intake and processing of audio, video, chat logs, and documents.

## Features

- **Media Intake**: Supports audio, video, documents, chat logs, emails, and images
- **Speech-to-Text (STT)**: Pluggable STT providers with mock implementation for testing
- **Speaker Diarization**: Identify and separate speakers in audio/video
- **Conversation Segmentation**: Segment conversations into sessions, threads, and key turns
- **Graph Integration**: Creates Communication entities in Graph Core
- **Spacetime Events**: Emits temporal-spatial events for communications
- **Provenance Tracking**: Full audit trail for all transforms
- **Policy Enforcement**: Retention policies, RTBF compliance, and PII redaction

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Start production server
pnpm start
```

## Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f media-pipeline-service
```

## API Endpoints

### Health

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe (checks providers)
- `GET /health/live` - Liveness probe
- `GET /health/detailed` - Detailed health with metrics

### Media Assets

- `POST /api/v1/media` - Create/ingest a media asset
- `GET /api/v1/media/:id` - Get media asset by ID
- `PATCH /api/v1/media/:id` - Update media asset
- `DELETE /api/v1/media/:id` - Delete media asset
- `GET /api/v1/media` - List media assets (with filters)
- `POST /api/v1/media/:id/process` - Trigger processing
- `GET /api/v1/media/:id/status` - Get processing status

### Transcripts

- `GET /api/v1/transcripts/:id` - Get transcript by ID
- `GET /api/v1/media/:mediaId/transcript` - Get transcript for media asset
- `GET /api/v1/transcripts/:id/utterances` - Get utterances (with filters)
- `GET /api/v1/transcripts/:id/threads` - Get conversation threads
- `GET /api/v1/transcripts/:id/participants` - Get participants
- `POST /api/v1/transcripts/:id/segment` - Re-segment transcript
- `POST /api/v1/transcripts/:id/redact` - Apply redaction
- `GET /api/v1/transcripts/:id/export` - Export (json, txt, srt, vtt)

### Providers

- `GET /api/v1/providers` - List all providers
- `GET /api/v1/providers/health` - Provider health status
- `GET /api/v1/providers/stt/:id` - STT provider details
- `GET /api/v1/providers/diarization/:id` - Diarization provider details

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4020 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `NODE_ENV` | development | Environment |
| `LOG_LEVEL` | info | Log level |
| `DATABASE_URL` | postgres://... | PostgreSQL connection |
| `REDIS_URL` | redis://localhost:6379 | Redis connection |
| `GRAPH_CORE_URL` | http://localhost:3001 | Graph Core service |
| `PROV_LEDGER_URL` | http://localhost:4010 | Provenance Ledger service |
| `SPACETIME_URL` | http://localhost:4030 | Spacetime service |
| `STT_DEFAULT_PROVIDER` | mock | Default STT provider |
| `DIARIZATION_DEFAULT_PROVIDER` | mock | Default diarization provider |
| `POLICY_DRY_RUN` | false | Policy enforcement dry-run mode |
| `ENABLE_AUTO_REDACTION` | true | Enable automatic PII redaction |
| `DEFAULT_RETENTION_DAYS` | 365 | Default retention period |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Media Pipeline Service                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
│  │  Intake  │───▶│   STT    │───▶│ Diarize  │───▶│ Segment  │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘ │
│       │                                               │         │
│       ▼                                               ▼         │
│  ┌──────────┐                                   ┌──────────┐   │
│  │ Validate │                                   │  Redact  │   │
│  └──────────┘                                   └──────────┘   │
│                                                       │         │
│                                                       ▼         │
│                    ┌──────────────────────────────────┴──┐      │
│                    │                                      │      │
│              ┌─────▼─────┐  ┌──────────┐  ┌────────────┐ │      │
│              │ Graph Sync│  │ Spacetime│  │ Provenance │ │      │
│              └───────────┘  └──────────┘  └────────────┘ │      │
│                                                          │      │
└──────────────────────────────────────────────────────────┴──────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │Graph Core│       │ Spacetime│       │Prov Ledger│
    └──────────┘       └──────────┘       └──────────┘
```

## Data Models

### MediaAsset
Represents raw media files (audio, video, documents, chat logs).

### Transcript
STT output containing utterances with speaker attribution.

### Utterance
Individual speech/message segments with timing and confidence.

### Thread
Conversation threads grouping related utterances.

### ParticipantRef
References to communication participants with optional entity linking.

## Testing

```bash
# Run unit tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run load tests
pnpm test:load

# Run all tests with coverage
pnpm test -- --coverage
```

## Development

### Adding a New STT Provider

1. Create provider class extending `BaseProvider` implementing `STTProvider`
2. Register in `providerRegistry.initialize()`
3. Add configuration options

### Adding Redaction Rules

```typescript
import { policyService } from './services/policy.service.js';

policyService.addRedactionRule({
  id: 'custom-rule',
  name: 'Custom Rule',
  pattern: 'PATTERN_REGEX',
  replacement: '[REDACTED]',
  enabled: true,
  priority: 100,
});
```

## License

Proprietary - IntelGraph Platform
