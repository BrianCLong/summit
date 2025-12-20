# Summit Agent Gateway

Production-grade AI Agent automation framework for the Summit platform with comprehensive safety, governance, and observability.

## Overview

The Agent Gateway provides a secure, governed interface for AI agents to interact with Summit's infrastructure. It implements all 16 agent stories (AGENT-1 through AGENT-16) with enterprise-grade safety controls.

## Features

### Core Capabilities

- **Agent Identity & Authentication** (AGENT-1)
  - Unique agent entities with API key authentication
  - Credential management and rotation
  - Multi-tenant scoping

- **Gateway Foundation** (AGENT-2)
  - Centralized request routing
  - No direct CLI/orchestrator access
  - Request validation and logging

- **Policy Enforcement** (AGENT-3)
  - OPA-based policy evaluation
  - Agent-specific authorization rules
  - Capability-based access control

- **Tenant Scoping** (AGENT-4)
  - Strict tenant isolation
  - Cross-tenant access blocking
  - Project-level scoping

- **Operation Modes** (AGENT-5)
  - **SIMULATION**: Evaluate without executing
  - **DRY_RUN**: Limited side-effects (planning/validation)
  - **ENFORCED**: Real execution with full controls

### Safety & Governance

- **Observability & Audit** (AGENT-7)
  - OpenTelemetry distributed tracing
  - Structured logging
  - Complete audit trail

- **Rate Limiting & Quotas** (AGENT-8)
  - Per-agent quotas (hourly/daily/monthly)
  - Resource consumption tracking
  - Automatic quota enforcement

- **Approval Workflow** (AGENT-9)
  - High-risk action approvals
  - Human-in-the-loop for critical operations
  - Approval expiration and tracking

- **Safety Scenarios** (AGENT-10)
  - Automated safety testing
  - Cross-tenant blocking verification
  - Rate limit validation

- **Continuous Monitoring** (AGENT-16)
  - Real-time health dashboards
  - Anomaly detection
  - Automated alerting

## Quick Start

### Installation

```bash
cd services/agent-gateway
npm install
```

### Database Setup

```bash
# Run database migrations
psql -U summit -d summit -f ../../db/migrations/017_agent_framework.sql
```

### Configure OPA

```bash
# Copy agent policy to OPA policies directory
cp policy/agent/agent_policy.rego /path/to/opa/policies/

# Start OPA
opa run --server --addr :8181 /path/to/opa/policies
```

### Start the Gateway

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The gateway will start on port 3001 (configurable via `PORT` env var).

## Configuration

Configure via environment variables:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=summit
DB_USER=summit
DB_PASSWORD=summit

# OPA
OPA_ENDPOINT=http://localhost:8181
OPA_DRY_RUN=false

# Operation Modes
FORCE_SIMULATION=false
DEFAULT_OPERATION_MODE=SIMULATION
ALLOW_MODE_OVERRIDE=true

# Approvals
APPROVAL_EXPIRY_MINUTES=60
APPROVAL_ASSIGNEES=admin-user-1,admin-user-2

# Features
ENABLE_DETAILED_LOGGING=true
ENABLE_METRICS=true
ENABLE_TRACING=true
ENABLE_SAFETY_CHECKS=true
ENABLE_CROSS_TENANT_BLOCKING=true
ENABLE_QUOTA_ENFORCEMENT=true
```

## Usage

### 1. Create an Agent

```bash
curl -X POST http://localhost:3001/api/admin/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-automation-agent",
    "description": "Automates data processing tasks",
    "agentType": "internal",
    "tenantScopes": ["tenant-123"],
    "capabilities": ["read:data", "write:data", "execute:pipelines"],
    "restrictions": {
      "maxRiskLevel": "medium",
      "requireApproval": ["high", "critical"],
      "maxDailyRuns": 1000
    }
  }'
```

Response includes agent ID and initial API key.

### 2. Execute Requests

```bash
curl -X POST http://localhost:3001/api/agent/execute \
  -H "Authorization: Bearer agt_..." \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "operationMode": "SIMULATION",
    "action": {
      "type": "read",
      "target": "entities",
      "payload": {
        "filter": "status=active"
      }
    }
  }'
```

### 3. Manage Approvals

```bash
# List pending approvals
curl -X GET "http://localhost:3001/api/approvals/pending?userId=admin-user-1"

# Approve/reject
curl -X POST http://localhost:3001/api/approvals/{id}/decide \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "approved",
    "reason": "Verified legitimate need",
    "userId": "admin-user-1"
  }'
```

## Example: Maintenance Agent

See `examples/maintenance-agent.ts` for a complete example of an internal agent that performs routine maintenance:

```bash
# Set credentials
export AGENT_API_KEY=agt_...
export TENANT_ID=tenant-123
export DRY_RUN=true

# Run maintenance
npm run example:maintenance
```

## Architecture

```
┌─────────────────┐
│   AI Agent      │
│  (External)     │
└────────┬────────┘
         │
         │ API Key Auth
         ▼
┌─────────────────┐
│  Agent Gateway  │◄────── OPA Policy Engine
│  - Auth         │
│  - Validation   │
│  - Routing      │
└────────┬────────┘
         │
         ├─► Quota Manager
         ├─► Approval Service
         ├─► Observability
         │
         ▼
┌─────────────────┐
│  Summit Core    │
│  - CLI          │
│  - Orchestrator │
│  - Provenance   │
└─────────────────┘
```

## Testing

```bash
# Run all tests
npm test

# Run safety scenario tests
npm run test:safety

# Watch mode
npm run test:watch

# Coverage
npm test -- --coverage
```

## Safety Scenarios

The framework includes automated safety tests:

1. **Cross-Tenant Access**: Verifies agents cannot access other tenants
2. **Rate Limiting**: Validates quota enforcement
3. **High-Risk Actions**: Tests approval workflow
4. **Operation Modes**: Verifies SIMULATION/DRY_RUN behavior
5. **Capability Enforcement**: Tests permission checks
6. **Authentication**: Validates credential management
7. **Audit Logging**: Ensures all actions are logged

## API Reference

### Admin Endpoints

- `POST /api/admin/agents` - Create agent
- `GET /api/admin/agents/:id` - Get agent details
- `GET /api/admin/agents` - List agents
- `PATCH /api/admin/agents/:id` - Update agent
- `DELETE /api/admin/agents/:id` - Delete agent
- `POST /api/admin/agents/:id/certify` - Certify agent
- `POST /api/admin/agents/:id/credentials` - Create credential
- `POST /api/admin/credentials/:id/rotate` - Rotate credential
- `DELETE /api/admin/credentials/:id` - Revoke credential

### Agent Endpoints

- `POST /api/agent/execute` - Execute request (main gateway)
- `GET /api/agent/me` - Get agent info
- `GET /api/agent/quotas` - Get quota status

### Approval Endpoints

- `GET /api/approvals/pending` - List pending approvals
- `POST /api/approvals/:id/decide` - Make decision
- `GET /api/approvals/:id` - Get approval details

## Monitoring

The gateway exposes health and metrics endpoints:

- `GET /health` - Health check
- `GET /config` - Configuration status

Integrates with:
- OpenTelemetry for distributed tracing
- Prometheus for metrics
- Structured logging (Pino)

## Security Considerations

1. **API Keys**: Stored as bcrypt hashes, never in plaintext
2. **Tenant Isolation**: Enforced at database, policy, and application layers
3. **Rate Limiting**: Per-agent quotas prevent abuse
4. **Approval Workflow**: High-risk actions require human approval
5. **Audit Trail**: All actions logged with full context
6. **Operation Modes**: SIMULATION/DRY_RUN for safe testing

## Production Deployment

### Prerequisites

- PostgreSQL 14+
- OPA (Open Policy Agent)
- Node.js 18+

### Deployment Steps

1. Run database migrations
2. Deploy OPA with agent policies
3. Configure environment variables
4. Start gateway service
5. Set up monitoring/alerting
6. Create initial agents
7. Test with SIMULATION mode
8. Gradually enable ENFORCED mode

### High Availability

- Run multiple gateway instances behind load balancer
- Use connection pooling for database
- Configure OPA with caching
- Set up health checks

## Troubleshooting

### Agent authentication fails
- Verify API key is correct
- Check agent status is 'active'
- Verify credential hasn't expired

### Policy denies all requests
- Check OPA is running: `curl http://localhost:8181/health`
- Verify policies are loaded
- Enable OPA dry-run mode for debugging

### Quota exceeded
- Check current quotas: `GET /api/agent/quotas`
- Reset quotas if needed (admin only)
- Increase limits in agent restrictions

## Contributing

See main Summit documentation for contribution guidelines.

## License

MIT - See LICENSE file
