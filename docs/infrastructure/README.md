# Infrastructure CODEX - Wave 2

This directory contains documentation for the enterprise infrastructure improvements implemented in Wave 2.

## Issues Addressed

### Issue #11814 - API Documentation with OpenAPI/Swagger ✅

**Implementation:**
- OpenAPI 3.0 specification at `/openapi/spec.yaml`
- Swagger UI at `/api/docs`
- ReDoc at `/api/docs/redoc`
- GraphQL Playground at `/api/docs/graphql-playground`
- Automated SDK generation for TypeScript and Python
- Comprehensive tests

**Key Files:**
- `/server/src/routes/api-docs.ts` - Documentation routes
- `/openapi/spec.yaml` - OpenAPI specification
- `/scripts/generate-sdk.sh` - SDK generation script
- `/server/src/routes/__tests__/api-docs.test.ts` - Tests

**Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

### Issue #11813 - Structured Logging with ELK/OpenTelemetry ✅

**Implementation:**
- Enhanced Winston logger with structured logging
- Correlation ID middleware
- OpenTelemetry integration (existing)
- ELK Stack (Elasticsearch, Logstash, Kibana) for log aggregation
- Environment-based log levels
- Performance and audit logging helpers

**Key Files:**
- `/server/src/utils/logger.ts` - Enhanced logging configuration
- `/server/src/middleware/correlation-id.ts` - Correlation tracking
- `/docker-compose.logging.yml` - ELK stack configuration
- `/infra/logstash/` - Logstash pipeline configuration
- `/infra/filebeat/` - Filebeat configuration

**Documentation:** [STRUCTURED_LOGGING.md](./STRUCTURED_LOGGING.md)

---

### Issue #11812 - Job Queue with Bull and Redis ✅

**Implementation:**
- Centralized BullMQ queue configuration
- Bull Board dashboard at `/queues`
- Example job processors with retry logic
- Scheduled/cron jobs support
- Priority queues
- Comprehensive error handling

**Key Files:**
- `/server/src/queues/config.ts` - Queue configuration
- `/server/src/routes/queues-dashboard.ts` - Bull Board integration
- `/server/src/queues/processors/emailProcessor.ts` - Example processor
- `/server/src/queues/processors/scheduledTasks.ts` - Cron jobs

**Documentation:** [JOB_QUEUES.md](./JOB_QUEUES.md)

---

## Quick Start

### 1. API Documentation

```bash
# Start server
make up

# Access documentation
open http://localhost:4000/api/docs
```

### 2. Logging Infrastructure

```bash
# Start ELK stack
docker-compose -f docker-compose.dev.yml -f docker-compose.logging.yml up

# Access Kibana
open http://localhost:5601
```

### 3. Job Queues

```bash
# Start server (includes Redis)
make up

# Access Bull Board dashboard
open http://localhost:4000/queues
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 IntelGraph Platform                 │
├─────────────────┬───────────────────┬───────────────┤
│                 │                   │               │
│  API Docs       │  Logging          │  Job Queues   │
│  (#11814)       │  (#11813)         │  (#11812)     │
│                 │                   │               │
│  ┌──────────┐   │  ┌──────────┐     │  ┌─────────┐  │
│  │ OpenAPI  │   │  │  Winston │     │  │ BullMQ  │  │
│  │  Spec    │   │  │  Logger  │     │  │ Queues  │  │
│  └────┬─────┘   │  └────┬─────┘     │  └────┬────┘  │
│       │         │       │           │       │       │
│  ┌────▼─────┐   │  ┌────▼─────┐     │  ┌────▼────┐  │
│  │ Swagger  │   │  │   Pino   │     │  │  Redis  │  │
│  │   UI     │   │  │   HTTP   │     │  │         │  │
│  └──────────┘   │  └────┬─────┘     │  └────┬────┘  │
│                 │       │           │       │       │
│  ┌──────────┐   │  ┌────▼─────┐     │  ┌────▼────┐  │
│  │   SDK    │   │  │   ELK    │     │  │  Bull   │  │
│  │Generator │   │  │  Stack   │     │  │  Board  │  │
│  └──────────┘   │  └──────────┘     │  └─────────┘  │
│                 │                   │               │
└─────────────────┴───────────────────┴───────────────┘
```

## Testing

### API Documentation Tests

```bash
cd server
npm test -- api-docs.test.ts
```

### Logging Tests

```bash
# Check Winston logger
node -e "import logger from './server/src/utils/logger.js'; logger.info('Test log')"

# Check ELK stack
curl http://localhost:9200/_cluster/health
```

### Queue Tests

```bash
# Check Bull Board
curl http://localhost:4000/queues/health

# Add test job
node -e "
import { addJob, QueueName } from './server/src/queues/config.js';
await addJob(QueueName.EMAIL, 'test', { message: 'Test' });
"
```

## Quality Checklist

- ✅ Full TypeScript types
- ✅ Comprehensive documentation
- ✅ Docker configurations
- ✅ Environment variable management
- ✅ Tests for API documentation
- ✅ Example implementations
- ✅ Error handling and retry logic
- ✅ Production-ready configurations

## Production Considerations

### API Documentation

- ✅ OpenAPI spec validated
- ✅ Authentication documented
- ✅ Rate limiting documented
- ⚠️ Consider disabling Swagger UI in production (or secure it)

### Logging

- ✅ Sensitive data redaction
- ✅ Log rotation configured
- ✅ Correlation IDs for tracking
- ⚠️ Set up log retention policies in Elasticsearch

### Job Queues

- ✅ Retry logic implemented
- ✅ Error handling
- ✅ Job cleanup configured
- ⚠️ Monitor Redis memory usage
- ⚠️ Scale workers based on load

## Next Steps

1. **Deploy to staging** and verify all features
2. **Set up monitoring** for queues and logs
3. **Configure alerts** for failed jobs and errors
4. **Train team** on new infrastructure
5. **Update runbooks** with troubleshooting guides

## Support

For questions or issues:
- See individual documentation files in this directory
- Check `/docs` for platform documentation
- Review code examples in `/server/src`

## License

MIT License - Copyright (c) 2025 IntelGraph
