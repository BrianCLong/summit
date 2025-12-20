# IntelGraph Platform API Documentation

> **Version**: 2.1.0
> **Status**: Production Ready
> **Last Updated**: 2025-01-15

## 📚 Overview

Welcome to the **IntelGraph Platform API** documentation! This comprehensive guide provides everything you need to integrate with IntelGraph's next-generation intelligence analysis platform with AI-augmented graph analytics.

## 🚀 Quick Start

### 1. Get API Credentials

1. Sign up at [console.intelgraph.ai](https://console.intelgraph.ai)
2. Navigate to **Settings → API Keys**
3. Generate a new API key
4. Save your key securely (it will only be shown once)

### 2. Choose Your Integration Method

#### Option A: Use Official SDKs (Recommended)

**TypeScript/JavaScript:**
```bash
npm install @intelgraph/sdk
```

**Python:**
```bash
pip install intelgraph-sdk
```

#### Option B: Direct REST/GraphQL API

Make HTTP requests directly to our API endpoints:

- **REST API**: `https://api.intelgraph.ai/v1/*` or `https://api.intelgraph.ai/v2/*`
- **GraphQL API**: `https://api.intelgraph.ai/graphql`

### 3. Authenticate

All API requests require authentication via JWT Bearer token:

```bash
curl -X POST https://api.intelgraph.ai/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "analyst@example.com",
    "password": "SecurePassword123!"
  }'
```

### 4. Make Your First API Call

```bash
curl https://api.intelgraph.ai/v2/graphs \
  -H "Authorization: Bearer <your-jwt-token>"
```

## 📖 Documentation Structure

```
docs/
├── index.html                          # API documentation homepage
├── API_INTEGRATION_GUIDE.md            # Comprehensive integration guide
├── API_VERSIONING_STRATEGY.md          # Versioning and deprecation policy
├── API_README.md                       # This file
├── openapi/                            # OpenAPI specifications
│   ├── index.html                      # REST API docs (ReDoc)
│   ├── spec.yaml                       # OpenAPI 3.0 spec (v1)
│   └── intelgraph-core-api.yaml        # Core API spec (v2)
└── graphql/                            # GraphQL documentation
    └── schema.graphql                  # GraphQL schema definition

openapi/
├── spec.yaml                           # REST API v1 spec
├── intelgraph-core-api.yaml            # Core API v2 spec
├── maestro.yaml                        # Maestro orchestration API
├── sdk-config-typescript.json          # TypeScript SDK generator config
└── sdk-config-python.json              # Python SDK generator config

examples/
├── typescript/
│   └── basic-investigation.ts          # TypeScript integration example
└── python/
    └── basic_investigation.py          # Python integration example

sdks/                                   # Generated client SDKs
├── typescript/                         # TypeScript/JavaScript SDK
└── python/                             # Python SDK
```

## 🔌 API Endpoints

### REST API

| Category | Endpoint | Description |
|----------|----------|-------------|
| **Authentication** | `POST /v2/auth/login` | Authenticate user |
| **Graphs** | `GET/POST /v2/graphs` | List or create graphs |
| **Entities** | `GET/POST /v2/graphs/{id}/entities` | Manage graph entities |
| **Relationships** | `GET/POST /v2/graphs/{id}/relationships` | Manage relationships |
| **AI Analysis** | `POST /v2/ai/analyze` | Run AI-powered analysis |
| **Cases** | `GET/POST /api/cases` | Investigation cases |
| **Evidence** | `GET/POST /api/evidence/{id}/annotations` | Evidence management |
| **Ingest** | `POST /api/ingest/start` | Data ingestion jobs |
| **Triage** | `GET/POST /api/triage/suggestions` | AI triage suggestions |
| **Admin** | `GET /api/admin/*` | Administrative operations |

**Full REST API Documentation**: [/api/docs](https://api.intelgraph.ai/api/docs)

### GraphQL API

**Endpoint**: `POST https://api.intelgraph.ai/graphql`

**Key Operations**:
- `query { investigation(id: $id) { ... } }` - Get investigation details
- `mutation { createEntity(input: $input) { ... } }` - Create entity
- `mutation { createRelationship(input: $input) { ... } }` - Create relationship
- `subscription { entityUpdated { ... } }` - Real-time updates

**Interactive Playground**: [/api/docs/graphql-playground](https://api.intelgraph.ai/api/docs/graphql-playground)

## 🛠️ SDKs & Client Libraries

### TypeScript/JavaScript SDK

```typescript
import { IntelGraphClient } from '@intelgraph/sdk';

const client = new IntelGraphClient({
  apiKey: process.env.INTELGRAPH_API_KEY,
});

// Create a graph
const graph = await client.graphs.create({
  name: 'Financial Fraud Investigation',
  tags: ['fraud', 'financial'],
});

// Add entity
const entity = await client.entities.create(graph.id, {
  type: 'Person',
  properties: { name: 'John Doe' },
});
```

**Documentation**: [TypeScript SDK README](../sdks/typescript/README.md)
**Examples**: [examples/typescript/](../examples/typescript/)

### Python SDK

```python
from intelgraph import IntelGraphClient

client = IntelGraphClient(api_key="your_api_key")

# Create a graph
graph = client.graphs.create(
    name="Financial Fraud Investigation",
    tags=["fraud", "financial"]
)

# Add entity
entity = client.entities.create(
    graph_id=graph.id,
    type="Person",
    properties={"name": "John Doe"}
)
```

**Documentation**: [Python SDK README](../sdks/python/README.md)
**Examples**: [examples/python/](../examples/python/)

## 📦 Generating SDKs

SDKs are automatically generated from OpenAPI specifications using `openapi-generator`.

### Generate SDKs Locally

```bash
# Generate both TypeScript and Python SDKs
./scripts/generate-sdks.sh

# Generate TypeScript SDK only
./scripts/generate-sdks.sh typescript

# Generate Python SDK only
./scripts/generate-sdks.sh python
```

### SDK Configuration

- **TypeScript**: `openapi/sdk-config-typescript.json`
- **Python**: `openapi/sdk-config-python.json`

## 🔄 API Versioning

IntelGraph Platform follows **Semantic Versioning** (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)

### Current Versions

| API | Version | Status | EOL Date |
|-----|---------|--------|----------|
| REST API v1 | 1.0.0 | ⚠️ Deprecated | 2025-06-30 |
| Core API v2 | 2.1.0 | ✅ Current | - |
| GraphQL | 2.1.0 | ✅ Current | - |

### Deprecation Policy

- **6 months notice** before deprecation
- **Sunset headers** in API responses
- **Migration guides** provided

**Full Versioning Strategy**: [API_VERSIONING_STRATEGY.md](./API_VERSIONING_STRATEGY.md)

## 📘 Integration Guide

Our comprehensive integration guide covers:

1. **Authentication** - JWT tokens, API keys, refresh tokens
2. **Quick Start Examples** - REST and GraphQL examples
3. **Using SDKs** - TypeScript and Python integration
4. **Error Handling** - Error codes, retry strategies
5. **Rate Limiting** - Limits and best practices
6. **Real-time Updates** - WebSocket subscriptions
7. **Best Practices** - Security, performance, optimization

**Read the Full Guide**: [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)

## 🔐 Authentication

### JWT Bearer Token (User Authentication)

```bash
# Login
TOKEN=$(curl -s -X POST https://api.intelgraph.ai/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}' \
  | jq -r '.token')

# Use token
curl https://api.intelgraph.ai/v2/graphs \
  -H "Authorization: Bearer $TOKEN"
```

### API Key (Service Authentication)

```bash
curl https://api.intelgraph.ai/v2/graphs \
  -H "X-API-Key: ig_prod_abc123..."
```

## 🚦 Rate Limiting

| Tier | Requests/Hour | Burst Limit |
|------|---------------|-------------|
| **Free** | 100 | 10/minute |
| **Professional** | 1,000 | 100/minute |
| **Enterprise** | 10,000 | 1,000/minute |

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1642262400
```

## 🎯 Common Use Cases

### 1. Create Investigation Graph

```typescript
const graph = await client.graphs.create({
  name: 'Financial Fraud Investigation',
  description: 'Q4 2024 analysis',
  tags: ['fraud', 'financial'],
});
```

### 2. Add Entities and Relationships

```typescript
const person = await client.entities.create(graph.id, {
  type: 'Person',
  properties: { name: 'John Doe', role: 'Suspect' },
});

const org = await client.entities.create(graph.id, {
  type: 'Organization',
  properties: { name: 'Shell Company LLC' },
});

const relationship = await client.relationships.create(graph.id, {
  type: 'WORKS_FOR',
  sourceId: person.id,
  targetId: org.id,
});
```

### 3. Run AI Analysis

```typescript
const analysisJob = await client.ai.analyze({
  graphId: graph.id,
  analysisType: 'community_detection',
  parameters: { algorithm: 'louvain' },
});

const results = await client.ai.waitForJob(analysisJob.jobId);
```

### 4. Query Graph (Cypher)

```typescript
const queryResult = await client.graphs.query(graph.id, {
  query: 'MATCH (p:Person)-[:KNOWS]->(p2:Person) RETURN p, p2',
});
```

## 🧪 Testing

### Test API Endpoints

```bash
# Health check
curl https://api.intelgraph.ai/health

# Detailed health
curl https://api.intelgraph.ai/health/detailed

# Metrics
curl https://api.intelgraph.ai/metrics
```

### Test Authentication

```bash
# Test login
curl -X POST https://api.intelgraph.ai/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## 🐛 Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested resource was not found",
    "details": { "resource": "graph", "id": "graph_invalid" }
  },
  "timestamp": "2025-01-15T10:30:00Z",
  "traceId": "trace_abc123"
}
```

### Common Error Codes

- `401 UNAUTHORIZED` - Invalid or expired authentication
- `403 FORBIDDEN` - Insufficient permissions
- `404 NOT_FOUND` - Resource not found
- `422 VALIDATION_ERROR` - Request validation failed
- `429 RATE_LIMIT_EXCEEDED` - Too many requests
- `500 INTERNAL_SERVER_ERROR` - Server error

## 📊 Monitoring & Observability

### Health Endpoints

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics

### Request Tracing

All API responses include a `X-Trace-Id` header for debugging:

```http
X-Trace-Id: trace_abc123def456
```

## 🔧 Development Tools

### Postman Collection

Import our Postman collection for easy API testing:

```bash
wget https://api.intelgraph.ai/postman/collection.json
```

### Insomnia Collection

```bash
wget https://api.intelgraph.ai/insomnia/collection.json
```

### GraphQL Clients

- **Apollo Client** (TypeScript)
- **Relay** (JavaScript)
- **graphql-request** (Lightweight)
- **gql** (Python)

## 🌐 Deployment

### GitHub Pages

API documentation is automatically deployed to GitHub Pages on every push to `main`:

**URL**: https://brianlong.github.io/summit/

### CI/CD

The `.github/workflows/api-docs.yml` workflow:

1. **Validates** OpenAPI specifications
2. **Generates** client SDKs
3. **Builds** documentation (ReDoc, Swagger UI)
4. **Deploys** to GitHub Pages
5. **Publishes** SDKs to npm/PyPI (on tag)

## 🤝 Contributing

### Updating API Documentation

1. **Edit OpenAPI specs**: `openapi/spec.yaml` or `openapi/intelgraph-core-api.yaml`
2. **Validate locally**:
   ```bash
   npx @stoplight/spectral-cli lint openapi/*.yaml
   ```
3. **Regenerate SDKs**:
   ```bash
   ./scripts/generate-sdks.sh
   ```
4. **Test SDKs** with integration examples
5. **Commit and push** - CI will handle the rest

### Adding New Examples

1. Create example file: `examples/typescript/your-example.ts` or `examples/python/your_example.py`
2. Follow existing example patterns
3. Include comprehensive comments
4. Test thoroughly before committing

## 📞 Support

### Resources

- 📖 **Full Documentation**: [docs.intelgraph.ai](https://docs.intelgraph.ai)
- 💬 **Community Forum**: [community.intelgraph.ai](https://community.intelgraph.ai)
- 📧 **Email Support**: [support@intelgraph.ai](mailto:support@intelgraph.ai)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/BrianCLong/summit/issues)
- 💼 **Enterprise Support**: [enterprise@intelgraph.ai](mailto:enterprise@intelgraph.ai)

### API Status

Check real-time API status: [status.intelgraph.ai](https://status.intelgraph.ai)

## 📜 License

MIT License - See [LICENSE](../LICENSE) file for details.

## 🙏 Acknowledgments

Built with:
- [OpenAPI Generator](https://openapi-generator.tech/)
- [ReDoc](https://redocly.com/)
- [Swagger UI](https://swagger.io/)
- [Apollo GraphQL](https://www.apollographql.com/)

---

**Happy Coding! 🚀**

For questions or feedback, reach out to [support@intelgraph.ai](mailto:support@intelgraph.ai)
