---
sidebar_position: 3
---

# Configuration Guide

Comprehensive guide to configuring Summit Platform.

## Environment Variables

Summit uses environment variables for configuration. Create a `.env` file in the project root:

```bash
cp .env.example .env
```

## Core Configuration

### Node Environment

```bash
# Environment mode
NODE_ENV=development  # development | production | test

# Debug logging
DEBUG=summit:*
```

### API Configuration

```bash
# Server port
PORT=4000

# CORS origins (comma-separated)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3000

# API rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=1000          # requests per window
```

## Database Configuration

### Neo4j (Graph Database)

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=devpassword
NEO4J_MAX_POOL_SIZE=50
NEO4J_CONNECTION_TIMEOUT=30000
```

**Production settings:**
```bash
NEO4J_URI=neo4j+s://prod-cluster.databases.neo4j.io
NEO4J_ENCRYPTION=true
NEO4J_TRUST_ALL_CERTIFICATES=false
```

### PostgreSQL (Relational Database)

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=summit_dev
POSTGRES_USER=summit
POSTGRES_PASSWORD=devpassword
POSTGRES_MAX_POOL_SIZE=20
POSTGRES_SSL=false

# Connection URL format (alternative)
DATABASE_URL=postgresql://summit:devpassword@localhost:5432/summit_dev
```

### TimescaleDB (Time-series)

```bash
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5433
TIMESCALEDB_DB=summit_timeseries
TIMESCALEDB_USER=timescale
TIMESCALEDB_PASSWORD=devpassword
```

### Redis (Cache & Sessions)

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=devpassword
REDIS_DB=0
REDIS_MAX_POOL_SIZE=10

# Connection URL format (alternative)
REDIS_URL=redis://:devpassword@localhost:6379/0
```

## Security Configuration

### JWT Authentication

```bash
# JWT secrets (MUST be different in production!)
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-different-from-jwt

# Token expiration
JWT_EXPIRES_IN=15m           # Access token: 15 minutes
JWT_REFRESH_EXPIRES_IN=7d    # Refresh token: 7 days

# Token issuer
JWT_ISSUER=summit-platform
```

:::danger Production Requirements
In production, Summit **REFUSES TO BOOT** if:
- `JWT_SECRET` or `JWT_REFRESH_SECRET` match known defaults
- Secrets contain `localhost` or wildcard patterns
- `CORS_ORIGIN` includes `localhost` in production mode
:::

### CORS & Security Headers

```bash
# Allowed origins
ALLOWED_ORIGINS=https://app.summit.io,https://admin.summit.io

# Security headers (automatically enabled in production)
HELMET_ENABLED=true
HSTS_ENABLED=true
CSP_ENABLED=true
```

### Rate Limiting

```bash
# Global rate limits
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=1000          # requests per window

# GraphQL-specific limits
GRAPHQL_RATE_LIMIT_MAX=500
GRAPHQL_DEPTH_LIMIT=10
GRAPHQL_COMPLEXITY_LIMIT=1000

# Persisted queries (recommended for production)
PERSISTED_QUERIES=1
PERSISTED_QUERIES_PATH=./persisted-queries.json
```

## AI/ML Configuration

### General AI Settings

```bash
# Enable AI features
AI_ENABLED=true
AI_MODELS_PATH=src/ai/models
AI_PYTHON_PATH=venv/bin/python
AI_MAX_CONCURRENT_JOBS=5

# GPU support (if available)
AI_ENABLE_GPU=true
CUDA_VISIBLE_DEVICES=0
```

### OCR (Optical Character Recognition)

```bash
OCR_ENABLED=true
OCR_DEFAULT_ENGINE=tesseract  # tesseract | paddleocr
OCR_CONFIDENCE_THRESHOLD=0.6
OCR_LANGUAGES=eng,deu,fra,spa
```

### Object Detection

```bash
OBJECT_DETECTION_ENABLED=true
OBJECT_DETECTION_MODEL=yolov8n.pt  # yolov8n | yolov8s | yolov8m
OBJECT_DETECTION_CONFIDENCE=0.5
OBJECT_DETECTION_IOU_THRESHOLD=0.45
```

### Speech Recognition

```bash
SPEECH_ENABLED=true
SPEECH_MODEL=whisper-base  # whisper-tiny | whisper-base | whisper-small
SPEECH_LANGUAGES=en,de,fr,es,auto
SPEECH_TRANSLATE_TO_ENGLISH=false
```

### Natural Language Processing

```bash
NLP_ENABLED=true
TEXT_ANALYSIS_MODEL=en_core_web_lg  # spaCy model
EMBEDDING_MODEL=all-MiniLM-L6-v2    # Sentence transformers
NER_CONFIDENCE_THRESHOLD=0.7
SENTIMENT_ENABLED=true
```

## Observability Configuration

### Logging

```bash
# Log level
LOG_LEVEL=info  # error | warn | info | debug | trace

# Log format
LOG_FORMAT=json  # json | pretty

# Log destinations
LOG_TO_FILE=true
LOG_FILE_PATH=/app/logs/application.log
LOG_MAX_SIZE=10485760  # 10MB
LOG_MAX_FILES=5
```

### OpenTelemetry

```bash
# Enable tracing
OTEL_ENABLED=true
OTEL_SERVICE_NAME=summit-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Sampling
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% of traces
```

### Prometheus Metrics

```bash
# Enable metrics endpoint
METRICS_ENABLED=true
METRICS_PATH=/metrics
METRICS_PORT=4000

# Prometheus scrape config
PROMETHEUS_URL=http://localhost:9090
```

### Grafana

```bash
GRAFANA_URL=http://localhost:3001
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin
```

## Feature Flags

```bash
# Enable/disable features
FEATURE_AI_SUGGESTIONS=true
FEATURE_REALTIME_COLLABORATION=true
FEATURE_ADVANCED_ANALYTICS=true
FEATURE_VECTOR_SEARCH=true
FEATURE_COPILOT=true
```

## Client Configuration

Create `client/.env`:

```bash
# API endpoint
VITE_API_URL=http://localhost:4000/graphql

# WebSocket endpoint
VITE_WS_URL=http://localhost:4000

# Feature flags
VITE_FEATURE_AI_COPILOT=true
VITE_FEATURE_REALTIME=true

# Analytics (optional)
VITE_GA_TRACKING_ID=UA-XXXXXXXXX-X
```

## Production Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets (32+ chars)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/TLS
- [ ] Configure production database URLs
- [ ] Set production CORS origins
- [ ] Enable rate limiting
- [ ] Enable persisted queries
- [ ] Configure monitoring/alerting
- [ ] Set up backup schedule
- [ ] Enable audit logging
- [ ] Configure secret management (AWS Secrets Manager, HashiCorp Vault, etc.)

### Generate Strong Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate JWT refresh secret (must be different)
openssl rand -base64 32

# Generate database password
openssl rand -base64 16
```

## Docker Configuration

### Docker Compose Environment

For Docker Compose deployments, you can also use `docker-compose.override.yml`:

```yaml
version: '3.8'
services:
  api:
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
```

### Build Arguments

```dockerfile
# Dockerfile ARGs
ARG NODE_VERSION=18
ARG PYTHON_VERSION=3.11
ARG BUILD_ENV=production
```

## Kubernetes Configuration

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: summit-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  RATE_LIMIT_MAX: "1000"
```

### Secrets

```bash
# Create Kubernetes secrets
kubectl create secret generic summit-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=jwt-refresh-secret=$(openssl rand -base64 32) \
  --from-literal=neo4j-password=$(openssl rand -base64 16) \
  --from-literal=postgres-password=$(openssl rand -base64 16) \
  --from-literal=redis-password=$(openssl rand -base64 16)
```

## Validation

Summit validates configuration on startup:

```bash
# Test configuration
pnpm run ci:prod-guard

# This checks:
# - Required environment variables are set
# - Secrets are not using defaults in production
# - Database connections are valid
# - CORS origins are properly configured
```

## Configuration Precedence

Configuration is loaded in this order (later overrides earlier):

1. Default values (in code)
2. `.env` file
3. Environment variables
4. Command-line arguments

## Environment Templates

### Development (`.env.example`)

Provided in the repository with safe defaults.

### Production (`.env.production.sample`)

Template with empty placeholders:

```bash
# REQUIRED: Set these values
JWT_SECRET=
JWT_REFRESH_SECRET=
NEO4J_PASSWORD=
POSTGRES_PASSWORD=
REDIS_PASSWORD=
```

## Next Steps

- 📊 [First Data Import](/docs/getting-started/first-import)
- 🔌 [API Documentation](/docs/api/overview)
- 🚀 [Deployment Guide](/docs/deployment/overview)

## Need Help?

- 📖 [Environment Variables Reference](/docs/guides/env-vars)
- 🐛 [Troubleshooting](/docs/guides/troubleshooting)
- 💬 [GitHub Discussions](https://github.com/BrianCLong/summit/discussions)
