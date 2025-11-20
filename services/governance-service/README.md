# Data Governance Service

A comprehensive REST API service for enterprise data governance operations, including policy management, compliance reporting, privacy request workflows, and audit logging.

## Features

- **Policy Management**: Create, update, and evaluate governance policies (access control, data retention, quality, privacy)
- **Compliance Framework**: Register and assess compliance frameworks (GDPR, CCPA, HIPAA, SOC2)
- **Privacy Workflows**: Handle privacy requests (access, erasure, rectification, portability)
- **Audit Logging**: Query and analyze audit logs with advanced filtering and export capabilities
- **OpenAPI Documentation**: Interactive Swagger UI for API exploration
- **Production-Ready**: Rate limiting, CORS, compression, error handling, health checks
- **TypeScript**: Fully typed with comprehensive type definitions
- **Security**: Helmet.js security headers, authentication middleware, role-based access control

## Architecture

```
governance-service/
├── src/
│   ├── server.ts              # Express server setup and configuration
│   ├── config.ts              # Environment-based configuration
│   ├── logger.ts              # Winston logging configuration
│   ├── middleware/
│   │   ├── error-handler.ts   # Global error handling
│   │   └── auth.ts            # Authentication/authorization stubs
│   └── routes/
│       ├── policies.ts        # Policy management endpoints
│       ├── compliance.ts      # Compliance framework endpoints
│       ├── privacy.ts         # Privacy request endpoints
│       └── audit.ts           # Audit log query endpoints
├── package.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13
- TypeScript >= 5.0

## Installation

```bash
# Install dependencies
pnpm install

# Build the service
pnpm build

# Run in development mode
pnpm dev

# Run in production mode
pnpm start
```

## Configuration

Create a `.env` file in the service root:

```env
# Server Configuration
PORT=3030
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=governance
DB_USER=postgres
DB_PASSWORD=postgres
DB_MAX_CONNECTIONS=20

# Security Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_HELMET=true

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json

# API Configuration
API_BASE_PATH=/api/v1
API_VERSION=1.0.0
API_DOCS_ENABLED=true

# Feature Flags
ENABLE_METRICS=true
ENABLE_TRACING=false
ENABLE_AUDIT_LOG=true
```

### Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3030` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment | `development` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `governance` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `LOG_LEVEL` | Logging level (info, debug, warn, error) | `info` |
| `API_DOCS_ENABLED` | Enable Swagger documentation | `true` |

## API Documentation

Once the service is running, access the interactive API documentation at:

```
http://localhost:3030/api-docs
```

## API Endpoints

### Health & Status

#### `GET /health`
Health check endpoint
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2025-11-20T10:00:00.000Z",
  "version": "1.0.0",
  "uptime": 123.45,
  "environment": "development"
}
```

#### `GET /ready`
Readiness check (includes database connection)
- **Response**: `200 OK` / `503 Service Unavailable`

### Policy Management

Base path: `/api/v1/policies`

#### `GET /api/v1/policies`
List all policies
- **Query Parameters**:
  - `type`: Filter by policy type (ACCESS_CONTROL, DATA_RETENTION, DATA_QUALITY, PRIVACY, CLASSIFICATION)
  - `enabled`: Filter by enabled status (boolean)
  - `limit`: Maximum results (default: 50, max: 100)
  - `offset`: Pagination offset (default: 0)
- **Authentication**: Required
- **Response**: `200 OK`

#### `GET /api/v1/policies/:id`
Get policy by ID
- **Authentication**: Required
- **Response**: `200 OK` / `404 Not Found`

#### `POST /api/v1/policies`
Create a new policy
- **Authentication**: Required (admin, governance-manager)
- **Body**:
```json
{
  "name": "PII Access Control",
  "description": "Controls access to PII data",
  "type": "ACCESS_CONTROL",
  "rules": {
    "conditions": ["role:data-steward", "clearance:high"],
    "effect": "allow"
  },
  "enabled": true,
  "priority": 100
}
```
- **Response**: `201 Created`

#### `PUT /api/v1/policies/:id`
Update a policy
- **Authentication**: Required (admin, governance-manager)
- **Response**: `200 OK` / `404 Not Found`

#### `DELETE /api/v1/policies/:id`
Delete a policy
- **Authentication**: Required (admin)
- **Response**: `200 OK` / `404 Not Found`

#### `POST /api/v1/policies/evaluate`
Evaluate access policy
- **Authentication**: Required
- **Body**:
```json
{
  "userId": "user-123",
  "resource": "database:pii-table",
  "action": "read",
  "context": {
    "department": "engineering",
    "classification": "confidential"
  }
}
```
- **Response**: `200 OK`

### Compliance Management

Base path: `/api/v1/compliance`

#### `GET /api/v1/compliance/frameworks`
List compliance frameworks
- **Query Parameters**: `enabled`, `limit`, `offset`
- **Authentication**: Required
- **Response**: `200 OK`

#### `GET /api/v1/compliance/frameworks/:id`
Get framework by ID
- **Authentication**: Required
- **Response**: `200 OK` / `404 Not Found`

#### `POST /api/v1/compliance/frameworks`
Register compliance framework
- **Authentication**: Required (admin, compliance-manager)
- **Body**:
```json
{
  "name": "GDPR",
  "description": "General Data Protection Regulation",
  "version": "2.0",
  "requirements": [
    {
      "id": "art-5",
      "name": "Principles relating to processing",
      "description": "Personal data shall be processed lawfully, fairly and in a transparent manner",
      "controls": ["data-minimization", "purpose-limitation"]
    }
  ],
  "enabled": true
}
```
- **Response**: `201 Created`

#### `POST /api/v1/compliance/assess/:frameworkId`
Run compliance assessment
- **Authentication**: Required (admin, compliance-manager, auditor)
- **Response**: `200 OK`

#### `GET /api/v1/compliance/reports`
Get compliance reports
- **Query Parameters**: `frameworkId`, `startDate`, `endDate`, `status`, `limit`, `offset`
- **Authentication**: Required
- **Response**: `200 OK`

### Privacy Management

Base path: `/api/v1/privacy`

#### `GET /api/v1/privacy/requests`
List privacy requests
- **Query Parameters**: `type`, `status`, `subjectId`, `limit`, `offset`
- **Authentication**: Required (admin, privacy-officer, data-protection-officer)
- **Response**: `200 OK`

#### `GET /api/v1/privacy/requests/:id`
Get privacy request by ID
- **Authentication**: Required
- **Response**: `200 OK` / `404 Not Found`

#### `POST /api/v1/privacy/requests`
Submit privacy request
- **Authentication**: Required
- **Body**:
```json
{
  "type": "ERASURE",
  "subjectId": "user-456",
  "subjectEmail": "user@example.com",
  "details": {
    "reason": "Account deletion request",
    "scope": "all"
  }
}
```
- **Response**: `201 Created`

**Request Types**:
- `ACCESS`: Right to access personal data
- `ERASURE`: Right to be forgotten
- `RECTIFICATION`: Right to correct data
- `PORTABILITY`: Right to data portability
- `RESTRICTION`: Right to restrict processing
- `OBJECTION`: Right to object to processing

#### `PUT /api/v1/privacy/requests/:id/status`
Update request status
- **Authentication**: Required (admin, privacy-officer)
- **Body**:
```json
{
  "status": "IN_PROGRESS",
  "notes": "Processing erasure request"
}
```
- **Response**: `200 OK`

#### `POST /api/v1/privacy/requests/:id/process`
Process privacy request
- **Authentication**: Required (admin, privacy-officer)
- **Response**: `200 OK`

#### `GET /api/v1/privacy/requests/:id/export`
Export data for privacy request
- **Query Parameters**: `format` (json, csv, xml)
- **Authentication**: Required
- **Response**: File download

#### `GET /api/v1/privacy/consents`
Get consent records
- **Query Parameters**: `subjectId`, `purpose`, `limit`, `offset`
- **Authentication**: Required
- **Response**: `200 OK`

#### `POST /api/v1/privacy/consents`
Record consent
- **Authentication**: Required
- **Body**:
```json
{
  "subjectId": "user-789",
  "purpose": "marketing-emails",
  "granted": true,
  "metadata": {
    "consentMethod": "web-form",
    "ipAddress": "192.168.1.1"
  }
}
```
- **Response**: `201 Created`

### Audit Logging

Base path: `/api/v1/audit`

#### `GET /api/v1/audit/logs`
Query audit logs
- **Query Parameters**:
  - `eventType`: Filter by event type
  - `userId`: Filter by user ID
  - `resource`: Filter by resource
  - `action`: Filter by action
  - `startDate`: Start date (ISO 8601)
  - `endDate`: End date (ISO 8601)
  - `severity`: Filter by severity (INFO, WARNING, ERROR, CRITICAL)
  - `limit`: Max results (default: 100, max: 1000)
  - `offset`: Pagination offset
- **Authentication**: Required (admin, auditor, compliance-manager)
- **Response**: `200 OK`

#### `GET /api/v1/audit/logs/:id`
Get audit log by ID
- **Authentication**: Required (admin, auditor)
- **Response**: `200 OK` / `404 Not Found`

#### `GET /api/v1/audit/events`
Get distinct event types
- **Authentication**: Required (admin, auditor)
- **Response**: `200 OK`

#### `GET /api/v1/audit/stats`
Get audit statistics
- **Query Parameters**: `startDate`, `endDate`, `groupBy`
- **Authentication**: Required (admin, auditor)
- **Response**: `200 OK`

#### `GET /api/v1/audit/timeline`
Get audit event timeline
- **Query Parameters**: `startDate`, `endDate`, `interval` (hour, day, week, month)
- **Authentication**: Required (admin, auditor)
- **Response**: `200 OK`

#### `GET /api/v1/audit/export`
Export audit logs
- **Query Parameters**: `format` (json, csv, xlsx), `startDate`, `endDate`, `eventType`
- **Authentication**: Required (admin, auditor)
- **Response**: File download

#### `POST /api/v1/audit/search`
Advanced audit log search
- **Authentication**: Required (admin, auditor)
- **Body**:
```json
{
  "query": "policy violation",
  "filters": {
    "severity": "ERROR",
    "userId": "user-123"
  },
  "limit": 100,
  "offset": 0
}
```
- **Response**: `200 OK`

## Authentication

The service includes authentication middleware stubs in `src/middleware/auth.ts`. To integrate with your authentication provider:

1. Implement token validation in the `authenticate` function
2. Replace stub user object with actual user from token
3. Configure JWT secret or OAuth provider settings

**Example request with authentication**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3030/api/v1/policies
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "error": {
    "message": "Resource not found",
    "code": "NOT_FOUND",
    "statusCode": 404,
    "details": {}
  },
  "timestamp": "2025-11-20T10:00:00.000Z",
  "path": "/api/v1/policies/invalid-id",
  "method": "GET"
}
```

**HTTP Status Codes**:
- `200`: Success
- `201`: Created
- `400`: Bad Request / Validation Error
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `429`: Too Many Requests
- `500`: Internal Server Error

## Rate Limiting

The service implements rate limiting to prevent abuse:
- Default: 100 requests per 15 minutes per IP
- Configurable via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`
- Returns `429 Too Many Requests` when limit exceeded

## Logging

Structured JSON logging using Winston:

```json
{
  "level": "info",
  "message": "HTTP Request",
  "method": "GET",
  "path": "/api/v1/policies",
  "statusCode": 200,
  "duration": "45ms",
  "timestamp": "2025-11-20 10:00:00",
  "service": "governance-service"
}
```

## Development

```bash
# Run in watch mode
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Run tests
pnpm test
```

## Production Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["node", "dist/server.js"]
```

### Environment Variables

Ensure all required environment variables are set in production:
- Database credentials
- CORS origins
- API keys (if using external services)
- Logging configuration

### Health Checks

Configure health check in your orchestrator:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3030/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Security Considerations

1. **Authentication**: Replace auth stubs with production auth provider
2. **Database**: Use connection pooling and prepared statements
3. **HTTPS**: Always use HTTPS in production
4. **Secrets**: Store sensitive config in secret management system
5. **Rate Limiting**: Adjust based on usage patterns
6. **CORS**: Restrict to known origins
7. **Input Validation**: All inputs are validated using express-validator

## Dependencies

### Core Dependencies
- `express`: Web framework
- `@summit/data-governance`: Core governance library
- `pg`: PostgreSQL client
- `winston`: Logging
- `express-rate-limit`: Rate limiting
- `helmet`: Security headers
- `cors`: CORS support
- `compression`: Response compression
- `swagger-ui-express`: API documentation
- `express-validator`: Request validation

### Development Dependencies
- `typescript`: TypeScript compiler
- `tsx`: TypeScript execution
- `@types/*`: TypeScript type definitions
- `eslint`: Code linting
- `jest`: Testing framework

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [repository-url]
- Email: support@summit.example.com
- Documentation: http://localhost:3030/api-docs

## Changelog

### v1.0.0 (2025-11-20)
- Initial release
- Policy management API
- Compliance framework API
- Privacy request workflows
- Audit log querying
- OpenAPI documentation
- Rate limiting and security features
