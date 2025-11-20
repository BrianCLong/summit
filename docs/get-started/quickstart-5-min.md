---
title: 5‑Minute Quickstart
summary: Your first successful Summit IntelGraph deployment, start to finish, in 5 minutes.
owner: docs
---

# 5-Minute Quickstart

Get Summit IntelGraph running locally in 5 minutes with real intelligence data.

## Prerequisites

**Required:**
- Docker 20+ and Docker Compose 2+
- Node.js 18+ (for CLI tools)
- 8GB RAM minimum, 16GB recommended
- macOS, Linux, or WSL2 on Windows

**Verify your setup:**
```bash
docker --version  # Should be 20.0+
docker compose version  # Should be 2.0+
node --version  # Should be v18+
```

## Quick Start

### 1. Clone and Setup (1 minute)

```bash
# Clone the repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# Copy environment configuration
cp .env.example .env
# ✅ Defaults work out-of-the-box for local development
```

### 2. Start Services (2 minutes)

```bash
# Start all services (Neo4j, Postgres, Redis, APIs, Frontend)
docker compose up -d

# Wait for services to be healthy (~90 seconds)
docker compose ps

# ✅ All services should show "healthy" status
```

**What's running:**
- **Neo4j** (graph database) — `localhost:7474` (neo4j/devpassword)
- **PostgreSQL** (metadata) — `localhost:5432`
- **Redis** (cache) — `localhost:6379`
- **API Gateway** — `localhost:4000/graphql`
- **Web UI** — `localhost:3000`

### 3. Load Demo Data (1 minute)

```bash
# Seed with sample intelligence data
npm run seed:demo

# ✅ Should see: "✓ Loaded 250 entities, 500 relationships, 10 cases"
```

### 4. Validate Installation (1 minute)

```bash
# Run smoke tests
npm run test:smoke

# ✅ Should see: "All systems operational (10/10 checks passed)"
```

**Or test manually:**

1. Open http://localhost:3000
2. Click **"Investigations"** → Should see demo cases
3. Click **"Graph Explorer"** → Should see network visualization
4. Try Copilot: "Show me all entities connected to Operation Nightfall"

## What's Next?

**Explore the Platform:**
- **Golden Path Tutorial** — Complete intelligence workflow walkthrough → [tutorials/golden-path](../tutorials/golden-path.md)
- **Developer Onboarding** — Deep dive for contributors → [DEVELOPER_ONBOARDING.md](../DEVELOPER_ONBOARDING.md)
- **Architecture** — Understand the 152-microservice platform → [ARCHITECTURE.md](../ARCHITECTURE.md)

**Try Key Features:**
- **AI Copilot** — Natural language to Cypher queries → [concepts/copilot.md](../concepts/copilot.md)
- **Provenance Tracking** — Audit trail for every claim → [concepts/provenance.md](../concepts/provenance.md)
- **Maestro CLI** — Build orchestration commands → [reference/maestro-cli.md](../reference/maestro-cli.md)

## Troubleshooting

### Services won't start

```bash
# Clean reset
docker compose down -v
docker compose up -d

# Check specific service logs
docker compose logs neo4j
docker compose logs api-gateway
```

### Seed data fails

```bash
# Ensure Neo4j is fully ready (may take 90 seconds on first boot)
docker compose logs neo4j | grep "Started"

# Then retry
npm run seed:demo
```

### Web UI shows errors

```bash
# Check API health
curl http://localhost:4000/health
# Should return: {"status":"ok","services":{"neo4j":"connected","postgres":"connected"}}

# Restart frontend
docker compose restart web
```

### Port conflicts

If ports 3000, 4000, 5432, 6379, or 7474 are in use:

```bash
# Edit .env file and change ports
nano .env

# Update these variables:
WEB_PORT=3001
API_PORT=4001
NEO4J_PORT=7475
POSTGRES_PORT=5433
REDIS_PORT=6380

# Restart
docker compose down
docker compose up -d
```

## Common First Commands

```bash
# View all logs
docker compose logs -f

# Stop services
docker compose down

# Start services again
docker compose up -d

# Reset everything (deletes data!)
docker compose down -v
docker compose up -d
npm run seed:demo

# Run full test suite
npm run test

# Check resource usage
docker stats
```

## Quick Tips

**Performance:**
- First startup takes ~2 minutes (Docker image pulls + database initialization)
- Subsequent startups take ~30 seconds
- Graph queries should return in <1 second

**Data:**
- Demo data includes realistic intelligence scenarios
- Safe to reset: `docker compose down -v && docker compose up -d`
- Real data ingestion: See [how-to/ingest-data.md](../how-to/ingest-data.md)

**Development:**
- Hot reload enabled for frontend (changes appear immediately)
- Backend requires restart: `docker compose restart api-gateway`
- Run tests before committing: `npm run test && npm run lint`

## Success Criteria

**You're ready when:**
- ✅ All services show "healthy" in `docker compose ps`
- ✅ Web UI loads at http://localhost:3000
- ✅ Smoke tests pass: `npm run test:smoke`
- ✅ You can view demo investigations and run graph queries
- ✅ Copilot responds to natural language questions

**Next:** Complete the [Golden Path Tutorial](../tutorials/golden-path.md) to see the full intelligence workflow in action.

---

**Need help?** Check [DEVELOPER_ONBOARDING.md](../DEVELOPER_ONBOARDING.md) for detailed troubleshooting or open an issue on GitHub.
