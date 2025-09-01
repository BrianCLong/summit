# IntelGraph Platform

[![Lint (Strict)](https://github.com/brianlong/intelgraph/actions/workflows/lint-only.yml/badge.svg)](https://github.com/brianlong/intelgraph/actions/workflows/lint-only.yml) [![Build & Publish](https://github.com/brianlong/intelgraph/actions/workflows/build-publish.yml/badge.svg)](https://github.com/brianlong/intelgraph/actions/workflows/build-publish.yml) [![Contract Tests](https://github.com/brianlong/intelgraph/actions/workflows/contract-tests.yml/badge.svg)](https://github.com/brianlong/intelgraph/actions/workflows/contract-tests.yml)

> **🎼 Important:** **Maestro builds IntelGraph. Maestro is separate from IntelGraph.** Maestro is the standalone orchestration service that coordinates the building, testing, and deployment of IntelGraph through intelligent automation. See [Maestro documentation](./docs/maestro/) for the build conductor details.

## Overview

IntelGraph is an AI-augmented intelligence analysis platform that enables analysts to create, query, and visualize complex knowledge graphs with integrated AI capabilities for enhanced insight generation.

## Architecture

IntelGraph consists of several key components:

- **Graph Database Layer**: Neo4j-based knowledge graph storage
- **AI Enhancement Engine**: Multi-provider LLM integration for entity extraction and analysis
- **Real-time Collaboration**: WebSocket-based collaborative analysis sessions
- **Security Framework**: RBAC/ABAC with policy-driven access controls
- **Provenance System**: Cryptographic verification of data lineage and analysis chains

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 14+
- Neo4j 5+

### Quick Start

```bash
# Clone the repository
git clone https://github.com/brianlong/intelgraph.git
cd intelgraph

# Install dependencies
npm install

# Start development environment
docker-compose up -d

# Run database migrations
npm run migrate

# Start the development servers
npm run dev
```

### Using Maestro to Build IntelGraph

IntelGraph is built and deployed using the Maestro orchestration platform:

```bash
# Install Maestro CLI
npm install -g @intelgraph/maestro

# Run IntelGraph build pipeline
maestro run --template intelgraph-build --env development

# Deploy to staging
maestro deploy --env staging --wait
```

## Project Structure

```
intelgraph/
├── server/                 # Node.js backend API
├── client/                 # React frontend application  
├── shared/                 # Shared types and utilities
├── packages/               # Reusable packages
│   ├── maestro-core/       # Maestro orchestration engine
│   └── maestro-cli/        # Maestro CLI interface
├── charts/                 # Helm deployment charts
├── docs/                   # Documentation
│   ├── maestro/           # Maestro build conductor docs
│   └── architecture.md    # System architecture
└── scripts/               # Build and deployment scripts
```

## Development

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests  
npm run test:integration

# End-to-end tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=server
```

## Documentation

- [Architecture Guide](./docs/architecture.md)
- [API Documentation](./docs/api/)
- [Deployment Guide](./docs/deployment/)
- [Maestro Orchestration](./docs/maestro/) - Build conductor documentation
- [Contributing Guide](./CONTRIBUTING.md)

## Security

IntelGraph implements defense-in-depth security:

- **Authentication**: OAuth 2.0 / OIDC with JWT tokens
- **Authorization**: Attribute-Based Access Control (ABAC) via OPA
- **Data Protection**: End-to-end encryption for sensitive analysis data
- **Supply Chain**: SBOM generation, artifact signing, and provenance tracking
- **Network Security**: mTLS for service-to-service communication

## Deployment

IntelGraph supports multiple deployment models:

- **Development**: Docker Compose for local development
- **Staging**: Kubernetes with Helm charts
- **Production**: Multi-region Kubernetes with HA configurations

Deployments are orchestrated by Maestro with policy-enforced promotion gates.

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Development setup
- Code style and standards
- Testing requirements
- Pull request process

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

- [Documentation](./docs/)
- [Issue Tracker](https://github.com/brianlong/intelgraph/issues)
- [Discussions](https://github.com/brianlong/intelgraph/discussions)

---

**Built with ❤️ by the IntelGraph team. Orchestrated by Maestro.**