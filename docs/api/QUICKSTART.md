# IntelGraph API Quick Start Guide

Get up and running with the IntelGraph Platform API in 5 minutes.

## 🚀 Quick Start

### 1. Access the Documentation

Visit the interactive API documentation:

```
http://localhost:4000/api/docs
```

Available documentation formats:
- **Swagger UI**: [/api/docs](http://localhost:4000/api/docs) - Interactive REST API docs
- **ReDoc**: [/api/docs/redoc](http://localhost:4000/api/docs/redoc) - Clean, searchable REST API docs
- **GraphQL Playground**: [/api/docs/graphql-playground](http://localhost:4000/api/docs/graphql-playground) - Interactive GraphQL explorer
- **OpenAPI Spec**: [/api/docs/openapi.json](http://localhost:4000/api/docs/openapi.json) - Machine-readable spec

### 2. Get Your Authentication Token

Contact your administrator to obtain a JWT token. Set it as an environment variable:

```bash
export API_TOKEN="your-jwt-token-here"
```

### 3. Test Your Connection

```bash
curl http://localhost:4000/health

# Expected response:
# {"status":"healthy","timestamp":"2025-01-15T10:30:00Z","version":"1.0.0"}
```

### 4. Make Your First API Call

#### REST API Example

```bash
# Create a new case
curl -X POST http://localhost:4000/api/cases \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Investigation"}'

# Response:
# {
#   "ok": true,
#   "case": {
#     "id": "abc123",
#     "title": "My First Investigation",
#     "status": "draft",
#     "evidence": []
#   }
# }
```

#### GraphQL Example

```bash
# Query entities
curl -X POST http://localhost:4000/graphql \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { entities(limit: 5) { id name type } }"
  }'
```

## 📚 Next Steps

1. **Explore the API**:
   - Visit [/api/docs](http://localhost:4000/api/docs) to try out different endpoints
   - Use the GraphQL Playground to explore the schema

2. **Read the Documentation**:
   - [Full API Reference](./README.md)
   - [API Changelog](./CHANGELOG.md)

3. **Review Common Workflows**:
   - [Case Management Workflow](./README.md#workflow-1-create-and-approve-investigation-case)
   - [Data Ingestion Workflow](./README.md#workflow-2-data-ingestion-from-external-source)
   - [AI-Powered Triage](./README.md#workflow-3-ai-powered-triage)

4. **Learn Best Practices**:
   - [Security Best Practices](./README.md#1-security)
   - [Performance Tips](./README.md#2-performance)
   - [Error Handling](./README.md#3-error-handling)

## 🔧 Configuration

### Environment Variables

```bash
# Required
OIDC_JWKS_URI=https://your-oidc-provider.com/.well-known/jwks.json
OIDC_ISSUER=https://your-oidc-provider.com
OIDC_AUDIENCE=intelgraph-api

# Optional
ENABLE_API_VALIDATION=true  # Enable request/response validation
NODE_ENV=development        # Enable additional debugging
GQL_MAX_BRACES=200         # GraphQL complexity limit
ENFORCE_GRAPHQL_OPNAME=true # Require operation names
```

### Enable Request Validation

Set `ENABLE_API_VALIDATION=true` to validate all requests against the OpenAPI schema:

```bash
export ENABLE_API_VALIDATION=true
```

## 🛠️ Development Tools

### Install Dependencies

```bash
pnpm install
```

### Run API Server Locally

```bash
# From repository root
pnpm run dev

# Or specifically run the API service
cd services/api
npm run dev
```

### Validate OpenAPI Spec

```bash
# Install validation tools
pnpm add -g @apidevtools/swagger-cli @stoplight/spectral-cli

# Validate syntax
swagger-cli validate openapi/spec.yaml

# Lint with Spectral
spectral lint openapi/spec.yaml --ruleset .spectral.yaml
```

### Generate API Changelog

```bash
# Generate changelog for changes since last tag
node scripts/generate-api-changelog.js

# Generate for specific version
node scripts/generate-api-changelog.js --version 1.1.0

# Preview without updating file
node scripts/generate-api-changelog.js --dry-run
```

## 📖 API Endpoints Overview

### REST API (`/api/*`)

| Category | Endpoints | Authentication |
|----------|-----------|----------------|
| **Cases** | 4 endpoints | Required |
| **Evidence** | 3 endpoints | Required |
| **Ingest** | 6 endpoints | Partial |
| **Triage** | 4 endpoints | Required |
| **Analytics** | 1 endpoint | Required |
| **Copilot** | 3 endpoints | Required |
| **Admin** | 8 endpoints | Required (admin) |
| **Health** | 2 endpoints | None |

### GraphQL API (`/graphql`)

| Category | Operations |
|----------|------------|
| **Queries** | 15+ root queries |
| **Mutations** | 20+ mutations |
| **Subscriptions** | 4 real-time subscriptions |

## 🔒 Security Notes

- **Always use HTTPS** in production
- **Never commit tokens** to version control
- **Rotate tokens** regularly
- **Use environment variables** for sensitive configuration
- **Enable rate limiting** in production

## 🆘 Troubleshooting

### Common Issues

**401 Unauthorized**
- Check that your JWT token is valid and not expired
- Verify the `Authorization: Bearer <token>` header is set correctly

**403 Forbidden**
- Ensure your user has the required permissions for the endpoint
- Check your role assignments in the admin console

**429 Too Many Requests**
- You've hit the rate limit
- Wait for the time specified in `X-RateLimit-Reset` header
- Implement exponential backoff in your client

**500 Internal Server Error**
- Check server logs for details
- Verify all required environment variables are set
- Ensure database connections are working

## 📞 Support

- **API Documentation**: [/api/docs](http://localhost:4000/api/docs)
- **Health Check**: [/health](http://localhost:4000/health)
- **Metrics**: [/metrics](http://localhost:4000/metrics)

For additional help, contact your system administrator.

---

**Happy coding! 🎉**
