# Citizen Service

Real-time citizen-centric service automation for personalized government services.

## Overview

This service implements the "ingest once, reuse everywhere" principle for citizen data, enabling:

- **Single Data Ingestion**: Citizens register once, data is automatically deduplicated
- **Cross-Domain Reuse**: Data flows seamlessly across education, healthcare, and administration
- **Consent-Based Sharing**: Strict consent management for privacy compliance
- **Proactive Services**: Eligibility computation enables proactive service recommendations

## Quick Start

```bash
# Development
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Run with Docker
docker-compose up
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health status |
| `/health/live` | GET | Liveness probe |
| `/health/ready` | GET | Readiness probe |
| `/metrics` | GET | Prometheus metrics |
| `/api/v1/citizens` | POST | Register citizen |
| `/api/v1/citizens/:id` | GET | Get unified view |
| `/api/v1/citizens/:id/consent` | POST | Grant consent |
| `/api/v1/citizens/:id/services` | POST | Request service |
| `/api/v1/citizens/:id/recommendations` | GET | Get recommendations |
| `/api/v1/citizens/:id/eligibility` | POST | Compute eligibility |

## Service Domains

- `education` - Schools, universities, scholarships
- `healthcare` - Medical services, insurance
- `administration` - ID cards, permits, licenses
- `taxation` - Tax filing, refunds
- `social_services` - Benefits, assistance programs
- `transportation` - Licenses, registrations
- `housing` - Permits, assistance
- `employment` - Job services, unemployment

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4010 | Server port |
| `LOG_LEVEL` | info | Logging level |
| `NEO4J_URI` | bolt://localhost:7687 | Neo4j connection |
| `NEO4J_USER` | neo4j | Neo4j username |
| `NEO4J_PASSWORD` | devpassword | Neo4j password |
| `REDIS_URL` | redis://localhost:6379 | Redis cache URL |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Education     │     │   Healthcare    │
│   Department    │     │   Ministry      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌──────────────────────────────────────────┐
│          Citizen Service API             │
│  ┌────────────┐  ┌────────────────────┐  │
│  │   Cache    │  │  Consent Manager   │  │
│  │  (Redis)   │  │                    │  │
│  └────────────┘  └────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │        Citizen Data Store          │  │
│  │           (Neo4j)                  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## License

Proprietary - Summit/IntelGraph Platform
