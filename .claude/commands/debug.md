# Debug Command

Systematic debugging assistance for Summit platform issues.

## Usage

When the user says `/debug <issue description>`, follow this systematic approach:

## Step 1: Gather Information

1. **Understand the error:**
   - What is the exact error message?
   - When does it occur?
   - Is it reproducible?

2. **Check service health:**
   ```bash
   curl -s http://localhost:4000/health/detailed | head -50
   ```

3. **Check recent logs:**
   ```bash
   docker-compose -f docker-compose.dev.yml logs --tail=100 api
   ```

## Step 2: Identify the Component

Based on the error, determine which component is affected:

| Error Pattern | Component | Investigation |
|---------------|-----------|---------------|
| `GraphQL` | API Service | Check resolvers, schema |
| `Neo4j` | Graph DB | Check cypher queries, connection |
| `PostgreSQL` | Relational DB | Check migrations, connection |
| `Redis` | Cache | Check connection, memory |
| `React` | Client | Check components, state |
| `TypeScript` | Build | Check types, imports |

## Step 3: Common Debug Commands

**API Issues:**
```bash
# Check API logs
docker-compose logs api | grep -i error

# Test GraphQL endpoint
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
```

**Database Issues:**
```bash
# Check PostgreSQL
docker-compose exec postgres psql -U postgres -c "SELECT 1"

# Check Neo4j
curl http://localhost:7474/db/neo4j/tx -u neo4j:devpassword
```

**Build Issues:**
```bash
# Clear caches
rm -rf node_modules/.cache .turbo

# Fresh install
pnpm install

# Verbose typecheck
pnpm typecheck 2>&1 | head -50
```

## Step 4: Apply Fix

1. Make minimal changes to fix the issue
2. Test the fix locally
3. Run relevant tests
4. Document the root cause and fix

## Step 5: Verify Resolution

```bash
# Run smoke tests
pnpm smoke

# Run related unit tests
pnpm test:jest -- --testPathPattern="<related-test>"
```

## Provide Clear Summary

After debugging, provide:
1. **Root Cause**: What caused the issue
2. **Fix Applied**: What was changed
3. **Prevention**: How to avoid in future
