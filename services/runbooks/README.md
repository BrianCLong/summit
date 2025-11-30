# Runbook Orchestration Service

The Runbook Orchestration Service provides automated workflow execution for investigative runbooks on the IntelGraph platform.

## Features

- **DAG-based Execution**: Executes workflows as directed acyclic graphs with automatic dependency resolution
- **Control Flow**: Supports conditionals (if/else), loops (for_each, while, count), and branching
- **Human-in-the-Loop**: Approval steps for sensitive operations
- **Event-Driven**: Wait for external events before proceeding
- **Service Integration**: Call external services via HTTP/gRPC with idempotency
- **Safety Guardrails**: Enforces limits on depth, concurrency, and resource usage
- **Authorization**: Integrates with OPA/authz service for step-level permissions
- **Audit Trail**: Comprehensive logging and evidence collection
- **Pause/Resume/Cancel**: Full control over long-running executions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Runbook Service                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐  │
│  │  REST API    │───▶│  Engine Core │───▶│ DAG Executor│  │
│  └──────────────┘    └──────────────┘    └─────────────┘  │
│                              │                    │        │
│                              ▼                    ▼        │
│                      ┌──────────────┐    ┌─────────────┐  │
│                      │State Manager │    │  Executors  │  │
│                      └──────────────┘    └─────────────┘  │
│                              │                             │
│                              ▼                             │
│                      ┌──────────────┐                      │
│                      │   Postgres   │                      │
│                      └──────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## Deployment

### Docker

```bash
docker build -t runbook-service:latest .
docker run -p 4000:4000 \
  -e DATABASE_URL=postgresql://user:pass@localhost:5432/runbooks \
  -e OPA_ENDPOINT=http://opa:8181 \
  runbook-service:latest
```

### Kubernetes

```bash
kubectl apply -f k8s/runbook-service.yaml
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | 4000 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `OPA_ENDPOINT` | OPA service endpoint | http://localhost:8181 |
| `MAX_CONCURRENT_STEPS` | Maximum concurrent steps per execution | 10 |
| `MAX_EXECUTION_TIME_MS` | Maximum execution time (ms) | 3600000 |
| `RATE_LIMIT_PER_TENANT` | Rate limit per tenant (per minute) | 100 |
| `LOG_LEVEL` | Logging level | info |

## API Endpoints

### Runbook Templates

- `GET /api/v1/runbooks` - List all runbooks
- `GET /api/v1/runbooks/:id` - Get runbook definition
- `POST /api/v1/runbooks` - Register new runbook (admin)

### Executions

- `POST /api/v1/executions` - Start runbook execution
- `GET /api/v1/executions/:id` - Get execution status
- `GET /api/v1/executions/:id/logs` - Get execution logs
- `GET /api/v1/executions/:id/evidence` - Get execution evidence
- `GET /api/v1/executions/:id/stats` - Get execution statistics
- `POST /api/v1/executions/:id/pause` - Pause execution
- `POST /api/v1/executions/:id/resume` - Resume execution
- `POST /api/v1/executions/:id/cancel` - Cancel execution
- `POST /api/v1/executions/:id/replay` - Replay execution
- `GET /api/v1/executions?runbookId=:id` - List executions for runbook

### Health

- `GET /api/v1/health` - Health check

## Security

### Authorization

All operations require proper authorization via the authz service. The service checks:

- Runbook execution permissions
- Step-level permissions based on type and context
- Control operation permissions (pause/resume/cancel)
- View permissions for execution details

### Legal Basis

Every execution requires a legal basis with:
- Authority (e.g., "INVESTIGATION", "COURT_ORDER")
- Classification (e.g., "SENSITIVE", "PUBLIC")
- Authorized users list

### Tenant Isolation

Strict tenant isolation is enforced:
- All operations are scoped to tenant ID
- Users must be in authorized users list
- Resource usage tracked per tenant

## Development

### Setup

```bash
cd runbooks/engine
npm install
npm run build
```

### Run Tests

```bash
npm test
npm run test:coverage
```

### Run Locally

```bash
npm run dev
```

## Usage Example

### Start a Runbook

```bash
curl -X POST http://localhost:4000/api/v1/executions \
  -H "Content-Type: application/json" \
  -d '{
    "runbookId": "r1-rapid-attribution",
    "context": {
      "legalBasis": {
        "authority": "INVESTIGATION",
        "classification": "SENSITIVE",
        "authorizedUsers": ["analyst-1"]
      },
      "tenantId": "my-tenant",
      "initiatedBy": "analyst-1",
      "assumptions": ["Data is current"]
    },
    "input": {
      "indicators": ["1.2.3.4", "evil.com"]
    }
  }'
```

### Check Status

```bash
curl http://localhost:4000/api/v1/executions/{executionId}
```

### Pause Execution

```bash
curl -X POST http://localhost:4000/api/v1/executions/{executionId}/pause
```

## Monitoring

The service exposes metrics for:
- Active executions per tenant
- Step execution times
- Failure rates
- Resource usage

## Troubleshooting

### Execution Stuck

Check execution status and logs:
```bash
curl http://localhost:4000/api/v1/executions/{executionId}/stats
curl http://localhost:4000/api/v1/executions/{executionId}/logs
```

If stuck on approval step, submit approval:
```bash
# (Approval submission API would be implemented)
```

### Rate Limit Exceeded

Increase `RATE_LIMIT_PER_TENANT` or contact administrator.

### Authorization Denied

Check:
1. User is in `authorizedUsers` list
2. User has required permissions in OPA
3. Tenant ID matches

## Support

For issues or questions, contact the platform engineering team.
