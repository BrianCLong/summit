---
sidebar_position: 1
---

# Quick Start

Get Summit running locally in under 10 minutes.

## Prerequisites

- **OS**: Linux, macOS, or WSL2 (Windows).
- **Tools**: `git`, `docker` (and `docker compose`), `node` (v20+), `pnpm`.
- **Memory**: Recommended 16GB RAM (for Neo4j + AI models).

## 1. Installation

Clone the repository and setup the environment:

```bash
# Clone the repo
git clone https://github.com/BrianCLong/summit.git
cd summit

# Bootstrap dependencies and environment variables
make bootstrap
```

The `make bootstrap` command will:
- Install project dependencies (`pnpm install`).
- Setup `.env` from defaults.
- Check for required tools.

## 2. Start the Stack

Launch all services (Neo4j, Postgres, API, UI):

```bash
make up
```

Wait for the health checks to pass (usually ~1-2 minutes).

## 3. Verify Installation

Run the smoke tests to ensure everything is working:

```bash
make smoke
```

If successful, you should see `All tests passed` or similar output indicating the "Golden Path" scenario completed successfully.

## 4. Access the Platform

- **UI**: [http://localhost:3000](http://localhost:3000)
- **API Playground**: [http://localhost:4000/graphql](http://localhost:4000/graphql)
- **Neo4j Browser**: [http://localhost:7474](http://localhost:7474) (User: `neo4j`, Password: see `.env`)

## Next Steps

- Read the [Internal Onboarding](/DEVELOPER_ONBOARDING) guide for deep development details.
- Explore [Governance & Provenance](/governance/provenance) to understand how Summit tracks data.
