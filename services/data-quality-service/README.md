# Data Quality Service

Production-ready REST API service for comprehensive data quality operations, built on top of the `@summit/data-quality` package.

## Features

- **Quality Assessment**: Comprehensive data quality scoring and analysis
- **Data Profiling**: Statistical analysis and pattern detection
- **Data Validation**: Rule-based validation with custom rules
- **Data Remediation**: Automated data cleansing and standardization
- **Health Checks**: Kubernetes-ready health, readiness, and liveness endpoints
- **Swagger/OpenAPI Documentation**: Interactive API documentation
- **Request Validation**: Input validation with express-validator
- **Rate Limiting**: Protection against abuse
- **Authentication**: JWT-based authentication (stub implementation)
- **CORS Support**: Configurable cross-origin resource sharing
- **JSON Logging**: Structured logging with Pino
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **TypeScript**: Full type safety and IntelliSense support

## Installation

```bash
# Install dependencies
npm install

# Build the service
npm run build

# Run in development mode with hot reload
npm run dev

# Run in production mode
npm start
```

## Configuration

The service is configured through environment variables. Create a `.env` file in the service root:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=summit
DB_USER=postgres
DB_PASSWORD=postgres
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# API Configuration
API_PREFIX=/api/v1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Logging Configuration
LOG_LEVEL=info
LOG_PRETTY_PRINT=true

# CORS Configuration
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# Authentication Configuration (stub)
AUTH_ENABLED=false
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Data Quality Configuration
DQ_MAX_BATCH_SIZE=10000
DQ_PROFILING_TIMEOUT=300000
DQ_VALIDATION_TIMEOUT=180000
DQ_ENABLE_ANOMALY_DETECTION=true
DQ_ENABLE_AUTO_REMEDIATION=false

# Swagger Configuration
SWAGGER_ENABLED=true
SWAGGER_PATH=/api-docs
```

## API Endpoints

### Health Checks

#### GET /health
Health check endpoint with database connectivity test.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-20T12:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "database": "connected"
}
```

#### GET /ready
Readiness probe for Kubernetes.

#### GET /live
Liveness probe for Kubernetes.

### Quality Assessment

#### POST /api/v1/quality/assess
Run comprehensive quality assessment on a dataset.

**Request:**
```json
{
  "tableName": "customers",
  "rules": [
    {
      "id": "email-format",
      "name": "Email Format Validation",
      "type": "format",
      "column": "email",
      "config": {
        "pattern": "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
      }
    }
  ],
  "config": {
    "sampleSize": 1000,
    "includeDistribution": true
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "profiles": [...],
    "validationResults": [...],
    "qualityScore": {
      "datasetId": "customers",
      "overallScore": 87.5,
      "dimensions": {
        "completeness": 95.0,
        "accuracy": 88.0,
        "consistency": 92.0,
        "validity": 75.0
      }
    },
    "anomalies": [...]
  }
}
```

#### GET /api/v1/quality/score/:datasetId
Get quality score for a specific dataset.

#### GET /api/v1/quality/scores
Get quality scores with optional filters.

**Query Parameters:**
- `minScore`: Minimum quality score (0-100)
- `maxScore`: Maximum quality score (0-100)
- `limit`: Maximum number of results (default: 100)
- `offset`: Pagination offset (default: 0)

#### GET /api/v1/quality/dashboard/:datasetId
Get comprehensive quality dashboard data.

#### GET /api/v1/quality/trends/:datasetId
Get quality score trends over time.

**Query Parameters:**
- `days`: Number of days to include (default: 30)

#### GET /api/v1/quality/dimensions/:datasetId
Get quality dimensions breakdown.

### Data Profiling

#### POST /api/v1/profiling/profile
Profile a dataset with statistical analysis.

**Request:**
```json
{
  "tableName": "customers",
  "columns": ["email", "age", "city"],
  "sampleSize": 5000,
  "includeDistribution": true
}
```

#### POST /api/v1/profiling/column
Profile a specific column.

**Request:**
```json
{
  "tableName": "customers",
  "columnName": "email",
  "sampleSize": 1000
}
```

#### GET /api/v1/profiling/statistics/:tableName/:columnName
Get statistical analysis for a column.

#### GET /api/v1/profiling/distribution/:tableName/:columnName
Get value distribution for a column.

**Query Parameters:**
- `limit`: Maximum number of values to return (default: 100)

#### GET /api/v1/profiling/patterns/:tableName/:columnName
Detect patterns in column values.

#### GET /api/v1/profiling/nulls/:tableName
Analyze null values across the dataset.

#### POST /api/v1/profiling/duplicates/:tableName
Find duplicate records.

**Request:**
```json
{
  "columns": ["email", "phone"]
}
```

#### POST /api/v1/profiling/correlations/:tableName
Calculate column correlations.

**Request:**
```json
{
  "columns": ["age", "income", "credit_score"]
}
```

### Data Validation

#### POST /api/v1/validation/rules
Register a validation rule.

**Request:**
```json
{
  "id": "age-range",
  "name": "Age Range Validation",
  "description": "Ensure age is between 18 and 120",
  "type": "range",
  "column": "age",
  "config": {
    "min": 18,
    "max": 120
  },
  "severity": "high"
}
```

#### GET /api/v1/validation/rules
Get all registered validation rules.

#### DELETE /api/v1/validation/rules/:ruleId
Remove a validation rule.

#### POST /api/v1/validation/validate
Validate dataset against registered rules.

**Request:**
```json
{
  "tableName": "customers",
  "batchSize": 1000,
  "stopOnError": false
}
```

#### POST /api/v1/validation/validate-column
Validate a specific column.

**Request:**
```json
{
  "tableName": "customers",
  "columnName": "email",
  "ruleType": "format",
  "config": {
    "pattern": "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
  }
}
```

#### POST /api/v1/validation/check-completeness
Check data completeness.

**Request:**
```json
{
  "tableName": "customers",
  "columns": ["email", "phone", "address"],
  "threshold": 0.95
}
```

#### POST /api/v1/validation/check-consistency
Check data consistency across columns.

#### POST /api/v1/validation/check-uniqueness
Check uniqueness constraints.

**Request:**
```json
{
  "tableName": "customers",
  "columns": ["email"]
}
```

#### POST /api/v1/validation/check-referential-integrity
Check referential integrity between tables.

**Request:**
```json
{
  "sourceTable": "orders",
  "sourceColumn": "customer_id",
  "targetTable": "customers",
  "targetColumn": "id"
}
```

#### GET /api/v1/validation/results/:validationId
Get validation results by ID.

### Data Remediation

#### POST /api/v1/remediation/plan
Create a remediation plan.

**Request:**
```json
{
  "validationResult": {
    "ruleId": "email-format",
    "violations": [...]
  },
  "strategy": "cleanse"
}
```

**Strategies:**
- `cleanse`: Remove invalid values
- `standardize`: Standardize data format
- `deduplicate`: Remove duplicates
- `impute`: Fill missing values
- `quarantine`: Move problematic records

#### POST /api/v1/remediation/execute
Execute a remediation plan.

**Request:**
```json
{
  "plan": {...},
  "dryRun": true
}
```

#### POST /api/v1/remediation/cleanse
Cleanse data by removing invalid values.

**Request:**
```json
{
  "tableName": "customers",
  "columnName": "email",
  "rules": [...]
}
```

#### POST /api/v1/remediation/standardize
Standardize data format.

**Request:**
```json
{
  "tableName": "customers",
  "columnName": "phone",
  "format": "E.164"
}
```

#### POST /api/v1/remediation/deduplicate
Remove duplicate records.

**Request:**
```json
{
  "tableName": "customers",
  "keyColumns": ["email"],
  "strategy": "keep_first"
}
```

**Strategies:**
- `keep_first`: Keep first occurrence
- `keep_last`: Keep last occurrence
- `keep_newest`: Keep newest by timestamp
- `merge`: Merge duplicate records

#### POST /api/v1/remediation/impute
Impute missing values.

**Request:**
```json
{
  "tableName": "customers",
  "columnName": "age",
  "method": "median"
}
```

**Methods:**
- `mean`: Use mean value
- `median`: Use median value
- `mode`: Use most frequent value
- `forward_fill`: Forward fill
- `backward_fill`: Backward fill
- `constant`: Use constant value

#### POST /api/v1/remediation/quarantine
Quarantine problematic records.

**Request:**
```json
{
  "tableName": "customers",
  "condition": "email IS NULL OR email NOT LIKE '%@%'",
  "quarantineTable": "customers_quarantine"
}
```

#### GET /api/v1/remediation/history/:datasetId
Get remediation history for a dataset.

**Query Parameters:**
- `limit`: Maximum number of results (default: 50)

#### POST /api/v1/remediation/rollback/:remediationId
Rollback a remediation action.

#### POST /api/v1/remediation/preview
Preview remediation impact (dry run).

## Error Responses

All errors follow a consistent format:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation failed",
  "details": [
    {
      "field": "tableName",
      "message": "Table name is required"
    }
  ]
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Swagger Documentation

Interactive API documentation is available at:

```
http://localhost:3000/api-docs
```

The Swagger UI provides:
- Complete API reference
- Request/response schemas
- Try-it-out functionality
- Authentication testing

## Development

### Project Structure

```
services/data-quality-service/
├── src/
│   ├── routes/
│   │   ├── quality.ts          # Quality assessment routes
│   │   ├── profiling.ts        # Data profiling routes
│   │   ├── validation.ts       # Validation routes
│   │   └── remediation.ts      # Remediation routes
│   ├── middleware/
│   │   └── error-handler.ts    # Error handling middleware
│   ├── config.ts               # Service configuration
│   └── server.ts               # Express server setup
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

```bash
# Development
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm run typecheck        # Type checking only
npm run lint             # Lint code

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode

# Production
npm start                # Start production server
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

Example test:

```typescript
import request from 'supertest';
import { createApp } from '../src/server';

describe('Health Checks', () => {
  it('should return healthy status', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});
```

## Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

Build and run:

```bash
docker build -t data-quality-service .
docker run -p 3000:3000 --env-file .env data-quality-service
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-quality-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: data-quality-service
  template:
    metadata:
      labels:
        app: data-quality-service
    spec:
      containers:
      - name: data-quality-service
        image: data-quality-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        livenessProbe:
          httpGet:
            path: /live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Performance Considerations

- **Connection Pooling**: PostgreSQL connection pool configured with max 20 connections
- **Rate Limiting**: Default 100 requests per 15 minutes per IP
- **Request Size Limits**: 10MB maximum request body size
- **Batch Processing**: Configurable batch sizes for large datasets
- **Timeouts**: Configurable timeouts for long-running operations

## Security

- **Helmet**: Security headers enabled
- **CORS**: Configurable CORS policies
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: All inputs validated with express-validator
- **SQL Injection**: Protected through parameterized queries
- **Authentication**: JWT-based authentication (stub implementation)

## Monitoring

The service provides comprehensive logging with structured JSON:

```json
{
  "level": "info",
  "time": 1700000000000,
  "msg": "Request completed",
  "method": "POST",
  "url": "/api/v1/quality/assess",
  "statusCode": 200,
  "duration": 1250
}
```

Integrate with monitoring solutions:
- Prometheus metrics (add prometheus-client)
- Datadog APM
- New Relic
- Elastic APM

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [summit/issues](https://github.com/summit/summit/issues)
- Email: support@summit.com
- Documentation: [docs.summit.com](https://docs.summit.com)
