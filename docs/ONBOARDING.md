# Developer Onboarding Guide

Welcome to the **IntelGraph Platform**! This guide will get you set up with a local development environment in under 10 minutes.

## 🚀 The Golden Path

We have automated the setup process to be as frictionless as possible. Follow these precise steps:

### 1. Prerequisites
Ensure you have the following installed:
- **Docker Desktop** (>= 4.x) - Ensure it is running and has at least 8GB RAM allocated.
- **Node.js** (>= 18)
- **Python** (>= 3.11)
- **Make**

### 2. Bootstrap Environment
Run the bootstrap command to install dependencies, set up environment variables, and perform a health check of your tools.

```bash
make bootstrap
```
*This runs a health-check validator first. If it fails, follow the instructions to fix your environment.*

### 3. Start Services
Launch the entire stack (Postgres, Neo4j, Redis, API, Client, Observability).

```bash
make up
# or
make dev
```
*This may take a few minutes on the first run as images are built/pulled.*

### 4. Load Demo Data
Seed the system with the "Operation Chimera" dataset to enable immediate exploration.

```bash
make demo-data
```

### 5. Verify Installation
Run the smoke tests to ensure the "Golden Path" (end-to-end investigation flow) is working correctly.

```bash
make smoke
```

---

## 🛠️ Common Developer Commands

| Command | Description |
|---------|-------------|
| `make bootstrap` | Install dependencies, setup `.env`, valid environment. |
| `make dev` | Start the full stack (alias for `make up`). |
| `make down` | Stop all services and remove orphans. |
| `make logs` | Tail logs for all running services. |
| `make demo-data` | Seed the database with investigation demo data. |
| `make check-env` | Run the standalone environment health check. |
| `make migrate` | Run database migrations (Postgres + Neo4j). |
| `make smoke` | Run E2E smoke tests. |

## 🔍 Troubleshooting

### Environment Validation Fails
If `make bootstrap` or `make check-env` fails:
- **Docker**: Ensure Docker Desktop is running (`docker info`).
- **Ports**: Check if ports 3000, 4000, 5432, 7474 are free (`lsof -i :4000`).

### Services Won't Start
- Check memory allocation in Docker Desktop (8GB recommended).
- Check logs: `make logs`.

### Smoke Tests Fail
- Ensure you ran `make demo-data`.
- Check API health: `curl http://localhost:4000/health/detailed`.

## 📚 Next Steps
- Review **[CONTRIBUTING.md](../CONTRIBUTING.md)** for code standards.
- Explore the **[Architecture Documentation](./ARCHITECTURE.md)**.
