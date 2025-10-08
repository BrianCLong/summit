# 🚀 Maestro Conductor Docker GA Release

## Overview

This directory contains the Docker-based GA (General Availability) release of the Maestro Conductor platform. It includes a complete, production-ready orchestration stack with all core services, monitoring, and release evidence helpers.

## 🎯 Goals Achieved

- Runnable GA stack via Docker Compose
- API, ingest, data stores, authz, telemetry/monitoring
- Release evidence helpers (manifest/attestation/verify)
- Observability with Prometheus, Grafana, and Jaeger
- Security with OPA policy enforcement

## 📦 What's Included

### Core Services
- **API**: Express + Apollo GraphQL (`/graphql`, `/metrics`, `/healthz`)
- **Ingest**: Kafka API via Redpanda (`/metrics`, `/healthz`)
- **Frontend**: nginx serving a status dashboard

### Data Stores
- **PostgreSQL**: Primary relational database
- **Neo4j**: Graph database with APOC plugins
- **Redis**: In-memory cache and session store

### Security & Policy
- **OPA**: Open Policy Agent with ABAC example

### Observability & Monitoring
- **Prometheus**: Metrics collection and storage
- **Grafana**: Dashboards and visualization
- **Jaeger**: Distributed tracing
- **OTEL Collector**: Telemetry aggregation

### Release Evidence
- **Scripts**: `gen-release-manifest.mjs`, `gen-release-attestation.mjs`, `verify-release-manifest.mjs`
- **npm scripts**: `release:manifest`, `release:attest`, `release:verify`
- **Make targets**: `make up|down|logs|ps|rebuild|seed|verify|evidence`

## 🚀 Quickstart

### Prerequisites
- Docker Desktop or Docker Engine
- Docker Compose
- Node.js 20+
- pnpm (optional but recommended)

### Setup
```bash
# Clone the repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Copy environment file
cp docker-ga-release/.env.example .env

# Start all services
make -C docker-ga-release up

# Optional: Create Kafka topics
make -C docker-ga-release seed
```

### Access Points
- **API health**: http://localhost:4000/healthz
- **GraphQL**: http://localhost:4000/graphql
- **Frontend**: http://localhost:3000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Jaeger UI**: http://localhost:16686

## 🧪 Release Evidence Generation

```bash
# Generate release manifest
npm run release:manifest

# Generate release attestation
npm run release:attest

# Verify release artifacts
npm run release:verify

# Or use Make targets
make -C docker-ga-release verify
make -C docker-ga-release evidence
```

## 📋 Acceptance & Verification

### Health Checks
```bash
# Verify all services are running
make -C docker-ga-release verify

# Or run the verification script directly
node docker-ga-release/scripts/health-check.mjs
```

### Metrics & Monitoring
- Metrics exported at `/metrics` for API/ingest services
- Prometheus jobs `api`, `ingest` should be green
- Grafana pre-loads "Maestro Overview" dashboard
- Panels show API up and request/ingest rates

### Release Evidence
- Scripts produce `dist/release-manifest-v2025.10.07.yaml` + `dist/release-attestation-v2025.10.07.jsonld`
- `release:verify` script passes successfully

## 🛡️ Notes & Next Steps

### Security
- Replace default credentials in `.env` before any shared environment use
- Enable TLS for production deployments
- Configure proper network segmentation

### Hardening (Optional)
- Swap Redpanda for full Kafka/ZK if you need parity tests
- Wire OTEL SDK in API/ingest for real traces (collector already in place)
- Implement mTLS ingress for Kubernetes deployments

### Kubernetes Migration
When moving to K8s, Helm overlays with the same topology + mTLS ingress will be provided.

## 📂 Directory Structure

```
docker-ga-release/
├── docker-compose.yml          # Main Docker Compose file
├── Makefile                    # Common operations
├── .env.example               # Environment variables template
├── package.json               # Node.js package file
├── tsconfig.json              # TypeScript configuration
├── services/                  # Service directories
│   ├── api/                  # API service files
│   ├── ingest/               # Ingest service files
│   ├── frontend/             # Frontend service files
│   ├── postgres/             # PostgreSQL service files
│   ├── redis/                # Redis service files
│   ├── neo4j/                # Neo4j service files
│   ├── opa/                  # OPA service files
│   ├── jaeger/               # Jaeger service files
│   ├── prometheus/           # Prometheus service files
│   ├── grafana/              # Grafana service files
│   └── otel-collector/       # OTEL Collector service files
├── grafana/                   # Grafana configuration
│   ├── dashboards/           # Dashboard definitions
│   │   └── maestro-overview.json # Overview dashboard
│   └── datasources/          # Data source definitions
│       └── datasource.yml    # Prometheus and Jaeger datasources
├── opa/                       # OPA policies
│   └── policy.rego           # ABAC example policy
├── scripts/                   # Helper scripts
│   ├── gen-release-manifest.mjs      # Generate release manifest
│   ├── gen-release-attestation.mjs   # Generate release attestation
│   ├── verify-release-manifest.mjs   # Verify release artifacts
│   ├── health-check.mjs      # Service health verification
│   └── verify-services.sh    # Service verification script
└── README.md                 # This file
```

## 🤝 Support

For issues, questions, or contributions, please:
1. Open an issue on GitHub
2. Contact the maintainers
3. Refer to the documentation in `docs/`

## 📄 License

This project is licensed under the Summit Enterprise OSS Hybrid license.
See [LICENSE](../LICENSE) for more information.