# Innovation Sandbox Service

Secure Innovation Sandbox for rapid prototyping with automatic sensitive data detection, test generation, and mission-ready deployment.

## Features

- **Secure Isolation**: 4 isolation levels (Standard, Enhanced, Airgapped, Mission-Ready)
- **Sensitive Data Detection**: Auto-detects PII, PHI, PCI, credentials, classified data
- **Test Generation**: Auto-generates test cases from executions
- **Mission Migration**: Multi-phase deployment to Kubernetes, Lambda, Edge, Mission Cloud
- **Chain of Custody**: Provenance tracking via prov-ledger integration

## Quick Start

```bash
# Start with docker-compose
docker-compose -f docker-compose.dev.yml -f docker-compose.sandbox.yml up -d

# Or run locally
cd services/innovation-sandbox
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/sandboxes` | Create sandbox |
| POST | `/api/v1/sandboxes/:id/execute` | Execute code |
| POST | `/api/v1/sandboxes/:id/migrate` | Deploy to mission platform |
| GET | `/api/v1/sandboxes/:id` | Get sandbox status |
| GET | `/api/v1/sandboxes/:id/executions` | Execution history |
| GET | `/api/v1/migrations/:id` | Migration status |
| GET | `/api/v1/templates` | List sandbox templates |
| GET | `/metrics` | Prometheus metrics |
| GET | `/health` | Health check |

## Isolation Levels

| Level | Network | Filesystem | Use Case |
|-------|---------|------------|----------|
| Standard | Allowed | Read/Write | Development |
| Enhanced | Limited | Read/Write | Testing |
| Airgapped | None | Read-only | Sensitive data |
| Mission-Ready | Controlled | Read-only | Production deployment |

## Configuration

Environment variables:

```bash
PORT=3100
REDIS_URL=redis://localhost:6379
PROV_LEDGER_URL=http://prov-ledger:3000
LOG_LEVEL=info
```

## Testing

```bash
npm test              # Run tests
npm run test:coverage # Coverage report
npm run typecheck     # Type checking
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Innovation Sandbox API                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Sandbox   │  │  Sensitive  │  │   Test Generator    │  │
│  │   Engine    │  │  Detector   │  │                     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│  ┌──────┴────────────────┴─────────────────────┴──────────┐ │
│  │                  Mission Migrator                       │ │
│  └─────────────────────────┬───────────────────────────────┘ │
├────────────────────────────┼────────────────────────────────┤
│  ┌──────────────┐  ┌───────┴───────┐  ┌──────────────────┐  │
│  │    Redis     │  │  Prov-Ledger  │  │   OPA Policies   │  │
│  │   Registry   │  │    Client     │  │                  │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```
