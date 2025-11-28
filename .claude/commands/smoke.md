# Smoke Test Command

Run the golden path smoke tests to validate the Summit platform is working correctly.

## Quick Run

```bash
pnpm smoke
```

Or via Make:
```bash
make smoke
```

## What Smoke Tests Validate

The smoke test validates the critical golden path:

1. **Service Health**
   - API responds at `/health`
   - All health checks pass
   - No critical errors in logs

2. **Database Connectivity**
   - PostgreSQL accessible
   - Neo4j graph queries work
   - Redis cache responds

3. **Golden Path Flow**
   - Investigation → Entities → Relationships → Copilot → Results
   - All GraphQL mutations succeed
   - Data persistence verified

4. **API Functionality**
   - GraphQL endpoint responds
   - Authentication works
   - Key queries return expected data

## Prerequisites

Before running smoke tests:

1. **Services must be running:**
   ```bash
   make up
   ```

2. **Wait for services to be healthy:**
   ```bash
   ./scripts/wait-for-stack.sh
   ```

3. **Database migrations applied:**
   ```bash
   make migrate
   ```

## Manual Health Checks

If smoke tests fail, run manual checks:

```bash
# API health
curl http://localhost:4000/health

# Detailed health
curl http://localhost:4000/health/detailed | jq

# Metrics endpoint
curl http://localhost:4000/metrics | head -20
```

## Troubleshooting Failed Smoke Tests

### Step 1: Check Service Status
```bash
docker-compose ps
```

### Step 2: View API Logs
```bash
docker-compose logs --tail=50 api
```

### Step 3: Test Individual Services
```bash
# PostgreSQL
docker-compose exec postgres pg_isready

# Neo4j
curl http://localhost:7474/

# Redis
docker-compose exec redis redis-cli ping
```

### Step 4: Restart Services
```bash
make down
make up
```

## CI vs Local

The smoke tests run identically in CI and locally:
- Uses same `scripts/smoke-test.js`
- Same test data from `data/golden-path/demo-investigation.json`
- Same health check endpoints

## Success Criteria

Smoke tests pass when:
- All health endpoints return 200
- GraphQL mutations complete successfully
- Golden path data flow works end-to-end
- No error messages in output

**Remember**: The golden path is sacred. Keep it green!
