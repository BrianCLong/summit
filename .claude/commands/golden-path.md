# Golden Path Command

Run the complete Summit golden path: Bootstrap → Up → Smoke.

## Quick Golden Path

```bash
./start.sh
```

Or step by step:
```bash
make bootstrap && make up && make smoke
```

## What This Does

### 1. Bootstrap
```bash
make bootstrap
```

- Checks prerequisites (Docker, Node.js)
- Creates `.env` from `.env.example`
- Installs Node dependencies (pnpm)
- Sets up Python virtual environment
- Creates development tools

### 2. Start Services
```bash
make up
```

- Builds Docker containers
- Starts all services:
  - API Server (port 4000)
  - Client (port 3000)
  - PostgreSQL (port 5432)
  - Neo4j (ports 7474, 7687)
  - Redis (port 6379)
  - Prometheus (port 9090)
  - Grafana (port 3001)
- Runs database migrations
- Waits for health checks

### 3. Validate
```bash
make smoke
```

- Checks service health
- Runs golden path tests
- Validates Investigation → Entities → Relationships → Copilot → Results
- Reports pass/fail status

## Prerequisites

Before running:

```bash
# Docker must be running
docker info

# Node.js 18+
node -v

# Python 3.11+ (optional, for ML features)
python3 --version
```

## Expected Outcome

After successful golden path:

```
Services ready! ✓
  - API: http://localhost:4000/graphql
  - Client: http://localhost:3000
  - Metrics: http://localhost:4000/metrics
  - Grafana: http://localhost:3001

smoke: DONE ✓
Golden path validated successfully! You're ready to develop.
```

## Troubleshooting

### Docker Not Running
```bash
# Start Docker Desktop
open -a Docker

# Wait for it to start
docker info
```

### Port Conflicts
```bash
# Check what's using ports
lsof -i :4000 -i :3000 -i :5432

# Kill conflicting processes or change ports in .env
```

### Services Won't Start
```bash
# Clean restart
make down
docker system prune -af
make up
```

### Smoke Tests Fail
```bash
# Check logs
docker-compose logs api

# Manual health check
curl http://localhost:4000/health/detailed | jq

# Restart specific service
docker-compose restart api
```

## CI Equivalence

The golden path runs identically in CI:
- Same `make bootstrap && make up && make smoke`
- Same test data
- Same health checks

**Rule**: If it works locally with golden path, it will work in CI.

## After Golden Path

You're ready to develop:
1. Create feature branch
2. Make changes
3. Run `pnpm lint && pnpm typecheck && pnpm test`
4. Run `make smoke` before committing
5. Create PR

**Remember**: Fresh clones must go green before writing code!
