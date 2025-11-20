# Quick Start Guide

Get the Data Quality Service up and running in minutes.

## 1. Local Development (Fastest)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server (with hot reload)
npm run dev
```

The service will be available at:
- API: http://localhost:3000/api/v1
- Health: http://localhost:3000/health
- Swagger: http://localhost:3000/api-docs

## 2. Docker Compose (Recommended)

```bash
# Start all services (API + PostgreSQL)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access at http://localhost:3000

## 3. Quick API Test

### Check service health
```bash
curl http://localhost:3000/health
```

### Profile a dataset
```bash
curl -X POST http://localhost:3000/api/v1/profiling/profile \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "customers",
    "sampleSize": 1000
  }'
```

### Run quality assessment
```bash
curl -X POST http://localhost:3000/api/v1/quality/assess \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "customers",
    "rules": [
      {
        "id": "email-format",
        "name": "Email Format",
        "type": "format",
        "column": "email",
        "config": {
          "pattern": "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
        }
      }
    ]
  }'
```

### Register a validation rule
```bash
curl -X POST http://localhost:3000/api/v1/validation/rules \
  -H "Content-Type: application/json" \
  -d '{
    "id": "age-range",
    "name": "Age Range Check",
    "type": "range",
    "column": "age",
    "config": {
      "min": 18,
      "max": 120
    },
    "severity": "high"
  }'
```

### Validate dataset
```bash
curl -X POST http://localhost:3000/api/v1/validation/validate \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "customers",
    "batchSize": 1000
  }'
```

### Get quality score
```bash
curl http://localhost:3000/api/v1/quality/score/customers
```

## 4. Common Use Cases

### Complete Quality Assessment Pipeline

```bash
# 1. Profile the data
curl -X POST http://localhost:3000/api/v1/profiling/profile \
  -H "Content-Type: application/json" \
  -d '{"tableName": "customers"}'

# 2. Register validation rules
curl -X POST http://localhost:3000/api/v1/validation/rules \
  -H "Content-Type: application/json" \
  -d '{
    "id": "email-required",
    "name": "Email Required",
    "type": "required",
    "column": "email"
  }'

# 3. Run validation
curl -X POST http://localhost:3000/api/v1/validation/validate \
  -H "Content-Type: application/json" \
  -d '{"tableName": "customers"}'

# 4. Get quality score
curl http://localhost:3000/api/v1/quality/score/customers

# 5. View quality dashboard
curl http://localhost:3000/api/v1/quality/dashboard/customers
```

### Data Remediation Workflow

```bash
# 1. Preview remediation (dry run)
curl -X POST http://localhost:3000/api/v1/remediation/preview \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "customers",
    "strategy": "cleanse"
  }'

# 2. Deduplicate records
curl -X POST http://localhost:3000/api/v1/remediation/deduplicate \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "customers",
    "keyColumns": ["email"],
    "strategy": "keep_first"
  }'

# 3. Impute missing values
curl -X POST http://localhost:3000/api/v1/remediation/impute \
  -H "Content-Type: application/json" \
  -d '{
    "tableName": "customers",
    "columnName": "age",
    "method": "median"
  }'

# 4. Check remediation history
curl http://localhost:3000/api/v1/remediation/history/customers
```

## 5. Interactive API Documentation

Open http://localhost:3000/api-docs in your browser to:
- Browse all available endpoints
- View request/response schemas
- Try out API calls directly
- Download OpenAPI specification

## 6. Configuration

Key environment variables (set in `.env`):

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=summit
DB_USER=postgres
DB_PASSWORD=postgres

# Features
DQ_ENABLE_ANOMALY_DETECTION=true
DQ_ENABLE_AUTO_REMEDIATION=false
SWAGGER_ENABLED=true
```

## 7. Development Commands

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Type checking
npm run typecheck

# All checks
make check
```

## 8. Troubleshooting

### Service won't start
- Check PostgreSQL is running: `docker-compose ps`
- Verify `.env` configuration
- Check logs: `docker-compose logs -f`

### Database connection failed
- Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in `.env`
- Ensure PostgreSQL is accessible: `psql -h localhost -U postgres`

### API returns 404
- Check API_PREFIX in `.env` (default: /api/v1)
- Verify endpoint path in Swagger docs

### Rate limit exceeded
- Adjust RATE_LIMIT_MAX in `.env`
- Wait for rate limit window to reset (default: 15 minutes)

## 9. Production Deployment

### Docker
```bash
# Build image
docker build -t data-quality-service:latest .

# Run container
docker run -p 3000:3000 --env-file .env data-quality-service:latest
```

### Kubernetes
```bash
# Deploy to cluster
kubectl apply -f k8s/

# Check status
kubectl get pods -n summit -l app=data-quality-service

# View logs
kubectl logs -f deployment/data-quality-service -n summit

# Port forward for testing
kubectl port-forward svc/data-quality-service 3000:80 -n summit
```

## 10. Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [API Documentation](http://localhost:3000/api-docs)
- Review [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
- See [CHANGELOG.md](./CHANGELOG.md) for version history

## Support

- Issues: https://github.com/summit/summit/issues
- Documentation: https://docs.summit.com
- Email: support@summit.com
