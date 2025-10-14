# Runbook: Local Development (Docker)

## Prerequisites
- Docker Desktop 4+
- Node 18+
- `cp .env.example .env` and fill required values

## Quick Start
```bash
# Start infrastructure services
docker compose -f docker-compose.dev.yml up -d redis neo4j postgres

# Start development servers
npm run server:dev   # terminal A
npm run client:dev   # terminal B

# Start ML services (optional)
docker compose -f docker-compose.dev.yml up -d intelgraph-ml intelgraph-ml-worker
```

## Seed Sample Data
```bash
# Neo4j: Connect to http://localhost:7474 and run sample queries
# Or load custom data via server/db/seeds/neo4j/sample_graph.cypher
```

## Default Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Neo4j Browser: http://localhost:7474 (neo4j/devpassword)
- ML Service: http://localhost:8081/docs
- Adminer (DB): http://localhost:8080

## Troubleshooting
- If services fail to start, check Docker Desktop resources
- Clear node_modules and reinstall if dependency issues
- Check logs: `docker compose -f docker-compose.dev.yml logs <service>`