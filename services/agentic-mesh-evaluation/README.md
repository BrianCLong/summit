# Agentic Mesh Evaluation Service

> **Enterprise-Grade Distributed AI Agent Mesh Coordination & Performance Evaluation**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)

## Overview

The Agentic Mesh Evaluation Service is a comprehensive platform for orchestrating, monitoring, and evaluating distributed AI agent systems operating in mesh network topologies. It provides enterprise-grade capabilities for:

- **Multi-Agent Coordination**: Orchestrate complex agent workflows across distributed mesh topologies
- **Performance Evaluation**: Run comprehensive evaluation scenarios with detailed metrics and analysis
- **Real-Time Monitoring**: Track mesh health, performance, and quality metrics in real-time
- **Advanced Routing**: Intelligent task distribution with multiple load balancing strategies
- **Fault Tolerance**: Built-in resilience with auto-healing and failover capabilities
- **Security & Compliance**: Enterprise security features with policy enforcement

## Features

### Core Capabilities

- ✅ **Multiple Mesh Topologies**: Peer-to-peer, hierarchical, hybrid, star, ring, grid, and custom
- ✅ **Advanced Routing**: Round-robin, least-loaded, capability-based, and custom routing strategies
- ✅ **Evaluation Scenarios**: Performance baseline, load testing, stress testing, fault injection, chaos engineering
- ✅ **Real-Time Metrics**: Comprehensive performance, reliability, scalability, and efficiency metrics
- ✅ **GraphQL API**: Full-featured GraphQL API with subscriptions for real-time updates
- ✅ **WebSocket Support**: Real-time bidirectional communication for live mesh updates
- ✅ **Prometheus Integration**: Production-ready metrics export for monitoring and alerting
- ✅ **Auto-Healing**: Automatic detection and recovery from node failures
- ✅ **Dynamic Topology**: Add/remove nodes without downtime

### Evaluation Scenarios

1. **Performance Baseline**: Establish baseline performance under normal conditions
2. **Load Testing**: Test performance under increasing load
3. **Stress Testing**: Find breaking points and capacity limits
4. **Fault Injection**: Test resilience with controlled failures
5. **Chaos Engineering**: Random failure injection for comprehensive resilience testing
6. **Scalability Testing**: Measure horizontal and vertical scaling capabilities
7. **Security Testing**: Validate security controls and policies
8. **Compliance Testing**: Ensure regulatory compliance

## Quick Start

### Prerequisites

- Node.js ≥ 18.0.0
- pnpm ≥ 9.12.0
- Redis ≥ 6.0
- Docker (optional, for containerized deployment)
- Kubernetes (optional, for production deployment)

### Installation

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Run tests
pnpm test

# Start development server
pnpm dev
```

### Configuration

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=development
PORT=4200
HOST=0.0.0.0
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

### Starting the Service

```bash
# Development mode (with hot-reload)
pnpm dev

# Production mode
pnpm start
```

The service will be available at:

- **GraphQL API**: http://localhost:4200/graphql
- **GraphQL Playground**: http://localhost:4200/graphiql
- **WebSocket**: ws://localhost:4200/ws
- **Health Check**: http://localhost:4200/health
- **Metrics**: http://localhost:4200/metrics

## API Documentation

### GraphQL API

#### Create a Mesh

```graphql
mutation CreateMesh {
  createMesh(input: {
    name: "Production Mesh"
    topology: PEER_TO_PEER
    nodes: [
      {
        name: "Agent 1"
        agentId: "agent-001"
        role: WORKER
        capabilities: ["computation", "analysis"]
        maxConcurrentTasks: 10
        endpoint: "http://agent-1:5000"
        protocol: ["websocket"]
      }
    ]
    tenantId: "tenant-123"
    ownerId: "user-456"
  }) {
    id
    name
    status
    metrics {
      totalNodes
      healthyNodes
    }
  }
}
```

#### Start an Evaluation

```graphql
mutation StartEvaluation {
  startEvaluation(input: {
    meshId: "mesh-123"
    scenario: PERFORMANCE_BASELINE
    triggeredBy: "user-456"
    triggerType: MANUAL
  }) {
    id
    status
    scenario
    results {
      score
      grade
      passed
    }
  }
}
```

#### Subscribe to Mesh Updates

```graphql
subscription MeshUpdates {
  meshUpdated(meshId: "mesh-123") {
    id
    status
    metrics {
      aggregateMetrics {
        successRate
        errorRate
        totalThroughput
      }
    }
  }
}
```

### REST API

#### List All Meshes

```bash
GET /api/v1/meshes
```

#### Create Mesh

```bash
POST /api/v1/meshes
Content-Type: application/json

{
  "name": "Test Mesh",
  "topology": "peer-to-peer",
  "nodes": [...],
  "tenantId": "tenant-123",
  "ownerId": "user-456"
}
```

#### Start Evaluation

```bash
POST /api/v1/evaluations
Content-Type: application/json

{
  "meshId": "mesh-123",
  "scenario": "performance-baseline",
  "triggeredBy": "user-456"
}
```

### WebSocket API

Connect to `ws://localhost:4200/ws` and send:

```json
{
  "type": "subscribe",
  "meshId": "mesh-123"
}
```

Receive real-time updates:

```json
{
  "type": "mesh_update",
  "data": { ... },
  "timestamp": "2025-11-25T12:00:00Z"
}
```

## Architecture

### Components

- **Mesh Coordinator**: Orchestrates mesh lifecycle and task distribution
- **Evaluation Engine**: Executes evaluation scenarios and generates reports
- **Mesh Registry**: Service discovery and node registration
- **Communication Fabric**: High-performance message routing
- **Metrics Collector**: Comprehensive performance monitoring

### Technology Stack

- **Runtime**: Node.js 18+ with TypeScript
- **API**: Fastify + Mercurius (GraphQL)
- **Data Store**: Redis for state and caching
- **Message Queue**: Bull for task queuing
- **Metrics**: Prometheus client for observability
- **Testing**: Jest for unit/integration tests

## Deployment

### Docker

```bash
# Build image
docker build -t summit/agentic-mesh-evaluation:latest .

# Run container
docker run -p 4200:4200 \
  -e REDIS_URL=redis://redis:6379 \
  summit/agentic-mesh-evaluation:latest
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods -n summit -l app=agentic-mesh-evaluation

# View logs
kubectl logs -n summit -l app=agentic-mesh-evaluation
```

### Docker Compose

```bash
docker-compose up -d
```

## Monitoring & Observability

### Prometheus Metrics

The service exposes Prometheus-compatible metrics at `/metrics`:

- `mesh_nodes_total`: Total nodes in mesh by status
- `mesh_tasks_total`: Total tasks processed
- `mesh_task_duration_seconds`: Task execution duration histogram
- `mesh_message_latency_ms`: Message delivery latency
- `mesh_throughput_per_second`: Tasks completed per second
- `mesh_error_rate`: Error rate percentage
- `mesh_resource_utilization`: Resource utilization by type

### Health Checks

```bash
# Basic health check
curl http://localhost:4200/health

# Detailed health status
curl http://localhost:4200/health/detailed
```

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test suite
pnpm test -- coordinator.test.ts

# Run in watch mode
pnpm test:watch

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run load tests
pnpm test:load
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

This service implements enterprise-grade security:

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: TLS for transport, encryption at rest
- **Audit Logging**: Comprehensive audit trail
- **Security Scanning**: Automated vulnerability scanning
- **Secret Management**: Secure secret storage

Report security vulnerabilities to security@summit.dev

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues
- **Email**: support@summit.dev

## Roadmap

- [ ] Advanced ML-based optimization
- [ ] Multi-region mesh support
- [ ] Enhanced visualization dashboard
- [ ] Integration with major cloud providers
- [ ] Advanced anomaly detection
- [ ] Custom plugin system

---

**Built with ❤️ by the Summit Platform Team**
