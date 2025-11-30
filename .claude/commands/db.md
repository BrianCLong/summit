# Database Command

Database operations for Summit's multi-database architecture (PostgreSQL, Neo4j, Redis).

## PostgreSQL Operations

### Check Status
```bash
docker-compose exec postgres pg_isready
```

### Run Migrations
```bash
pnpm db:pg:migrate
```

### Migration Status
```bash
pnpm db:pg:status
```

### Generate Prisma Client
```bash
pnpm db:pg:generate
```

### Create New Migration (Prisma)
```bash
pnpm --filter @intelgraph/db prisma migrate dev --name <migration_name>
```

### Rollback (Knex)
```bash
pnpm db:knex:rollback
```

## Neo4j Operations

### Check Connection
```bash
curl -u neo4j:devpassword http://localhost:7474/db/neo4j/cluster/available
```

### Run Neo4j Migrations
```bash
pnpm db:neo4j:migrate
```

### Access Cypher Shell
```bash
docker exec -it <neo4j-container> cypher-shell -u neo4j -p devpassword
```

### Common Cypher Queries
```cypher
// Count all nodes
MATCH (n) RETURN count(n);

// Count relationships
MATCH ()-[r]->() RETURN count(r);

// List all labels
CALL db.labels();

// List all relationship types
CALL db.relationshipTypes();
```

## Redis Operations

### Check Connection
```bash
docker exec -it <redis-container> redis-cli ping
```

### View Keys
```bash
docker exec -it <redis-container> redis-cli KEYS '*'
```

### Flush Cache (Development Only)
```bash
docker exec -it <redis-container> redis-cli FLUSHDB
```

## Seeding Data

### Seed Demo Data
```bash
pnpm seed:demo
```

### Seed Case/Entity/Triage Demo
```bash
pnpm seed:demo:cet
```

### Golden Path Test Data
```bash
node scripts/devkit/seed-fixtures.js
```

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check container status
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Verify connection string
echo $DATABASE_URL
```

### Neo4j Connection Issues
```bash
# Check container status
docker-compose ps neo4j

# View logs
docker-compose logs neo4j

# Browser access
open http://localhost:7474
```

### Reset Databases (Development Only)
```bash
# Stop services
make down

# Remove volumes
docker-compose down -v

# Restart fresh
make up
```

## Best Practices

1. **Always use migrations** - Never modify schema directly
2. **Test migrations locally** - Before pushing to CI
3. **Backup before major changes** - Use `scripts/backup.sh`
4. **Use transactions** - For multi-step operations
5. **Index critical fields** - Check query performance
