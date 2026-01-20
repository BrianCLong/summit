# Summit Platform v4.1 - Quick Start Guide

## Prerequisites

- **Infrastructure:** Access to an AWS EKS cluster (or local Minikube for dev).
- **Databases:** Neo4j 5.x Enterprise + Postgres 14+.
- **Tools:** `kubectl`, `helm`, `node` (v20+).

## 1. Install the CLI

```bash
npm install -g @summit/cli
summit --version
# Should output: v4.1.4
```

## 2. Verify Environment

Run the Doctor tool to check your environment (Node.js 18+, Docker, pnpm, Redis, Postgres, and Makefile targets):

```bash
summit doctor check --auto-fix
```

_The tool will check for:_

- **Node.js:** v18.0.0 or higher.
- **pnpm:** Installed and available.
- **Docker:** Daemon running and reachable.
- **Makefile Targets:** Presence of `bootstrap`, `up`, `migrate`, `smoke`, and `down`.
- **Infrastructure:** Reachability of Redis (6379) and PostgreSQL (5432).
- **Environment:** Presence and validity of `.env` file.

## 3. Platform Bootstrap

After verification, use the standard Makefile targets to initialize the platform:

```bash
make bootstrap  # Install dependencies
make up         # Start infrastructure (Docker)
make migrate    # Run database migrations
make smoke      # Execute smoke tests
```

## 4. Verify Health

Access the detailed health endpoint to confirm all subsystems (Maestro, IntelGraph) are talking:

```bash
curl https://api.your-domain.com/health/detailed
```

## Common Pitfalls

- **Neo4j Connection:** Ensure your Neo4j user has `admin` roles; v4.1 enforces strict RBAC at the database level.
- **CORS:** If your frontend fails to connect, check the `ALLOWED_ORIGINS` env var; wildcards are disabled in v4.1.
