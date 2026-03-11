# 🏔 Summit - Agentic AI OSINT Platform

> Open-source intelligence workflows with graph + agent foundations, local-first development tooling, and governance controls.

[![Build Status](https://github.com/BrianCLong/summit/workflows/CI/badge.svg)](https://github.com/BrianCLong/summit/actions)
[![Coverage](https://img.shields.io/codecov/c/github/BrianCLong/summit)](https://codecov.io/gh/BrianCLong/summit)
[![License](https://img.shields.io/github/license/BrianCLong/summit)](LICENSE)

## ✅ Current State (Reality Check)

Summit is actively developed and runs locally, but several roadmap capabilities are still under construction.

**Implemented and usable now**

- Local bring-up with Docker + Node + pnpm
- Health endpoint and core API surfaces
- Existing governance, security, and CI policy scaffolding
- GraphRAG evidence contracts and architecture docs

**In progress / partial**

- Connector breadth and ingestion UX
- Turnkey demo pipelines for instant "first data" experience
- End-to-end autonomous multi-agent workflows

For explicit roadmap status, see [`docs/roadmap/STATUS.json`](docs/roadmap/STATUS.json).

## 🚀 Quickstart

### Prerequisites

- Node.js 18+
- Docker & Docker Compose

### Install & Run

```bash
git clone https://github.com/BrianCLong/summit.git
cd summit
pnpm install
docker-compose up -d
pnpm db:migrate
pnpm dev
```

- API: `http://localhost:4000`
- Web UI: `http://localhost:3000`

### Golden Path

```bash
./scripts/golden-path.sh
```

Or manually:

```bash
make clean
make bootstrap
make up
```

See [Golden Path Troubleshooting](docs/dev/golden-path-troubleshooting.md).

### First Query

```bash
curl -X POST http://localhost:4000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ health { status version } }"}'
```

## 🏛 Architecture

Summit follows a modular architecture across API, ingestion/switchboard, graph services, orchestration, and evidence/governance controls.

Start here:

- [Architecture Overview](docs/architecture/README.md)
- [Ingestion & Switchboard](docs/architecture/ingestion.md)
- [GraphRAG Documentation](docs/graphrag/README.md)
- [Security](docs/security/README.md)

## 📡 API Reference

- [API Overview](docs/api/README.md)
- [GraphQL Guide](docs/api/graphql.md)
- [REST Guide](docs/api/rest.md)
- [CompanyOS Surface](docs/api/companyos.md)

## 🧪 Testing

```bash
pnpm test
pnpm lint
pnpm typecheck
make smoke
```

## 🤝 Contributing

- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## 📄 License

[MIT License](LICENSE)
