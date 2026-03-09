# Health Check Command

Check the health status of all Summit platform services.

## Quick Health Check

```bash
curl -s http://localhost:4000/health | jq
```

## Detailed Health Check

```bash
curl -s http://localhost:4000/health/detailed | jq
```

## All Service Health Checks

### API Server
```bash
curl -s http://localhost:4000/health
curl -s http://localhost:4000/health/ready
curl -s http://localhost:4000/health/live
```

### Metrics Endpoint
```bash
curl -s http://localhost:4000/metrics | head -20
```

### GraphQL Endpoint
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

### PostgreSQL
```bash
docker-compose exec postgres pg_isready -U postgres
```

### Neo4j
```bash
curl -s http://localhost:7474/ | head -5
```

### Redis
```bash
docker-compose exec redis redis-cli ping
```

### Client (if running)
```bash
curl -s http://localhost:3000 | head -5
```

### Grafana (Observability)
```bash
curl -s http://localhost:3001/api/health
```

## Comprehensive Health Script

```bash
#!/bin/bash
echo "=== Summit Health Check ==="

echo -n "API: "
curl -sf http://localhost:4000/health && echo "OK" || echo "FAIL"

echo -n "GraphQL: "
curl -sf -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}' > /dev/null && echo "OK" || echo "FAIL"

echo -n "PostgreSQL: "
docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1 && echo "OK" || echo "FAIL"

echo -n "Neo4j: "
curl -sf http://localhost:7474/ > /dev/null && echo "OK" || echo "FAIL"

echo -n "Redis: "
docker-compose exec -T redis redis-cli ping > /dev/null 2>&1 && echo "OK" || echo "FAIL"

echo "=== Check Complete ==="
```

## Health Endpoint Response Format

The `/health/detailed` endpoint returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z",
  "services": {
    "database": { "status": "up", "latency": 5 },
    "neo4j": { "status": "up", "latency": 10 },
    "redis": { "status": "up", "latency": 2 }
  },
  "version": "1.0.0"
}
```

## Troubleshooting Unhealthy Services

### Service Not Responding
```bash
docker-compose ps
docker-compose restart <service-name>
```

### High Latency
```bash
docker stats
# Check for CPU/memory issues
```

### Connection Refused
```bash
# Check if port is in use
lsof -i :4000
lsof -i :5432
lsof -i :7687
```

Report detailed health status to the user with specific issues and recommended actions.
