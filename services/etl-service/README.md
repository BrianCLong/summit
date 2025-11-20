# ETL Service

Comprehensive data pipeline and ETL service with REST API for managing and executing data pipelines.

## Features

- 🔄 **Pipeline Management**: Create, update, and execute data pipelines via REST API
- 📊 **CDC Support**: Change Data Capture with multiple strategies (timestamp, version, trigger-based)
- ✅ **Data Quality**: Six-dimensional quality monitoring and reporting
- 🔍 **Lineage Tracking**: Complete provenance integration with audit trails
- 📈 **Metrics & Monitoring**: Comprehensive pipeline metrics and health checks
- 🚀 **Scalable**: Support for batch and streaming data processing

## Quick Start

### Installation

```bash
cd services/etl-service
pnpm install
```

### Development

```bash
pnpm dev
```

### Production

```bash
pnpm build
pnpm start
```

## Environment Variables

```bash
ETL_SERVICE_PORT=4020
ETL_SERVICE_HOST=0.0.0.0
DATABASE_URL=postgresql://localhost:5432/summit
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

## API Endpoints

### Health Check

```bash
curl http://localhost:4020/health
```

### Create Pipeline

```bash
curl -X POST http://localhost:4020/pipelines \
  -H "Content-Type: application/json" \
  -d '{
    "id": "users-pipeline",
    "name": "Users ETL Pipeline",
    "type": "database",
    "connectionConfig": {},
    "extractionConfig": {
      "strategy": "incremental",
      "incrementalColumn": "updated_at"
    },
    "loadConfig": {
      "strategy": "upsert",
      "targetTable": "users_dwh",
      "upsertKey": ["user_id"]
    }
  }'
```

### Execute Pipeline

```bash
curl -X POST http://localhost:4020/pipelines/users-pipeline/execute
```

### Get Pipeline Runs

```bash
curl http://localhost:4020/pipelines/users-pipeline/runs
```

### Start CDC

```bash
curl -X POST http://localhost:4020/pipelines/users-pipeline/cdc/start
```

### Get Metrics

```bash
curl http://localhost:4020/metrics
```

## Documentation

- [Data Pipeline Guide](../../docs/data-pipelines/DATA_PIPELINE_GUIDE.md)
- [Operations Runbook](../../docs/data-pipelines/OPERATIONS_RUNBOOK.md)
- [ETL Framework Package](../../packages/etl-framework/)

## Architecture

```
┌─────────────────────────────────────────┐
│         ETL Service (Fastify)           │
│  ┌───────────────────────────────────┐  │
│  │      Pipeline Management API      │  │
│  └───────────────────────────────────┘  │
│               ▼                          │
│  ┌───────────────────────────────────┐  │
│  │   ETL Framework Integration       │  │
│  │  - Pipeline Executor              │  │
│  │  - CDC Engine                     │  │
│  │  - Quality Monitor                │  │
│  │  - Incremental Loader             │  │
│  │  - Provenance Integration         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## License

MIT
