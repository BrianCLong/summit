# AI Sandbox Service

Secure, isolated sandbox environments for government AI system testing, validation, and fast-track deployment.

## Overview

The AI Sandbox service provides:

- **Isolated Execution**: VM-based sandboxed code execution with resource quotas
- **Compliance Frameworks**: FedRAMP, FISMA, NIST 800-53, NIST AI RMF, EO 14110, OMB M-24-10
- **Policy Engine**: Automated compliance validation with violation tracking
- **Async Processing**: BullMQ-powered task queue for experiment execution
- **Fast-Track Deployment**: Streamlined deployment workflow with approval chains

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Test
npm test

# Type check
npm run typecheck
```

## API Endpoints

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/health/ready` | GET | Readiness check with queue stats |
| `/metrics` | GET | Prometheus metrics |

### Environments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/environments` | POST | Create sandbox environment |
| `/api/v1/environments/:id` | GET | Get environment details |
| `/api/v1/environments` | GET | List environments |

### Experiments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/experiments` | POST | Submit experiment |
| `/api/v1/experiments/:id` | GET | Get experiment result |
| `/api/v1/experiments/:id/status` | GET | Get experiment status |

### Deployments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/deployments` | POST | Request fast-track deployment |

### Queue

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/queue/stats` | GET | Queue statistics |

## Usage Example

### 1. Create a Sandbox Environment

```bash
curl -X POST http://localhost:4020/api/v1/environments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agency Test Environment",
    "agencyId": "agency-001",
    "complianceFrameworks": ["FEDRAMP_MODERATE", "NIST_AI_RMF"],
    "resourceQuotas": {
      "cpuMs": 60000,
      "memoryMb": 1024,
      "timeoutMs": 120000
    }
  }'
```

### 2. Submit an Experiment

```bash
curl -X POST http://localhost:4020/api/v1/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "environmentId": "<environment-id>",
    "name": "LLM Safety Test",
    "modelConfig": {
      "modelId": "gpt-4",
      "modelType": "llm",
      "provider": "openai",
      "version": "1.0"
    },
    "testCases": [
      {"id": "tc-1", "name": "Safety Test", "input": "test prompt", "tags": ["safety"]}
    ],
    "validationRules": [
      {"type": "safety", "config": {}},
      {"type": "bias", "config": {}}
    ]
  }'
```

### 3. Check Experiment Status

```bash
curl http://localhost:4020/api/v1/experiments/<task-id>/status
```

### 4. Request Deployment

```bash
curl -X POST http://localhost:4020/api/v1/deployments \
  -H "Content-Type: application/json" \
  -d '{
    "experimentId": "<experiment-id>",
    "targetEnvironment": "staging",
    "approvals": [
      {"approverId": "user-1", "role": "technical-lead", "approvedAt": "2024-01-01T00:00:00Z"},
      {"approverId": "user-2", "role": "security-officer", "approvedAt": "2024-01-01T00:00:00Z"}
    ],
    "deploymentConfig": {
      "replicas": 2,
      "rolloutStrategy": "canary"
    }
  }'
```

## Compliance Frameworks

| Framework | Description |
|-----------|-------------|
| `FEDRAMP_HIGH` | FedRAMP High baseline controls |
| `FEDRAMP_MODERATE` | FedRAMP Moderate baseline controls |
| `FISMA` | Federal Information Security Management Act |
| `NIST_800_53` | NIST SP 800-53 security controls |
| `NIST_AI_RMF` | NIST AI Risk Management Framework |
| `EXECUTIVE_ORDER_14110` | Executive Order on Safe AI |
| `OMB_M_24_10` | OMB Memorandum M-24-10 |

## Validation Rules

| Type | Description |
|------|-------------|
| `accuracy` | Output accuracy validation |
| `bias` | Bias detection and fairness testing |
| `safety` | Safety and content policy checks |
| `latency` | Performance benchmarking |
| `compliance` | Regulatory compliance validation |
| `custom` | User-defined validation rules |

## Security

The sandbox enforces:

- Static analysis blocking dangerous patterns (require, import, eval, process, etc.)
- Resource quotas (CPU, memory, timeout, output size)
- Network isolation by default
- Whitelist-based globals (Math, Date, JSON, etc.)
- Full audit trail for all operations

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4020 | Service port |
| `NODE_ENV` | development | Environment |
| `LOG_LEVEL` | info | Logging level |
| `REDIS_HOST` | localhost | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `WORKER_CONCURRENCY` | 4 | Concurrent workers |
| `CORS_ORIGIN` | * | CORS allowed origins |

## Docker

```bash
# Build
docker build -t summit-ai-sandbox .

# Run
docker run -p 4020:4020 \
  -e REDIS_HOST=redis \
  summit-ai-sandbox
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Fastify)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │Environments│ │Experiments│ │Deployments│ │  Queue   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Policy Engine (OPA)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Compliance Checks: FedRAMP, NIST, EO 14110, etc.    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Task Queue (BullMQ)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Async Processing • Retries • Progress Tracking       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Sandbox Runtime (Node.js VM)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Isolated Execution • Resource Quotas • Audit Logs    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## License

Proprietary - Summit/IntelGraph Platform
