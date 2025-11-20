# Quick Start: Summit Governance System

Get the governance system running in under 15 minutes!

## Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ installed
- 8GB RAM available
- PostgreSQL CLI tools (psql)

## Step 1: Start Infrastructure (2 minutes)

```bash
# Copy environment configuration
cp .env.governance.example .env

# Start all services with Docker Compose
docker-compose -f docker-compose.governance.yml up -d

# Verify all services are running
docker-compose -f docker-compose.governance.yml ps
```

Expected output:
```
NAME                STATUS    PORTS
summit-opa          Up        0.0.0.0:8181->8181/tcp
summit-postgres     Up        0.0.0.0:5432->5432/tcp
summit-neo4j        Up        0.0.0.0:7474->7474/tcp, 0.0.0.0:7687->7687/tcp
summit-redis        Up        0.0.0.0:6379->6379/tcp
summit-prometheus   Up        0.0.0.0:9090->9090/tcp
summit-grafana      Up        0.0.0.0:3001->3000/tcp
```

## Step 2: Run Database Migrations (3 minutes)

### PostgreSQL Migration

```bash
# Run governance schema migration
psql $DATABASE_URL -f server/src/migrations/001_governance_schema.sql

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

Expected tables:
- `warrants`
- `warrant_usage`
- `access_purposes`
- `access_requests`
- `audit_events`
- `policy_tag_metadata`
- `data_retention_policies`

### Neo4j Migration

```bash
# Install dependencies
npm install

# Run Neo4j policy tag migration
npm run migrate:neo4j

# Or manually with cypher-shell
cypher-shell -u neo4j -p summit_dev_password < scripts/neo4j-policy-tags.cypher
```

## Step 3: Verify OPA is Running (1 minute)

```bash
# Check OPA health
curl http://localhost:8181/health

# Test policy evaluation
curl -X POST http://localhost:8181/v1/data/intelgraph/abac/allow \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "user": {
        "id": "test-user",
        "tenant": "test-tenant",
        "roles": ["admin"],
        "scopes": [],
        "clearance_levels": ["internal"],
        "residency": "US"
      },
      "resource": {
        "type": "investigation",
        "tenant": "test-tenant",
        "policy_sensitivity": "internal",
        "policy_legal_basis": ["investigation"],
        "policy_purpose": ["investigation"]
      },
      "context": {
        "purpose": "investigation",
        "legal_basis": ["investigation"],
        "purposes": ["investigation"]
      },
      "operation_type": "query"
    }
  }'
```

Expected response:
```json
{
  "result": {
    "allow": true,
    "deny_reason": []
  }
}
```

## Step 4: Start Application (2 minutes)

```bash
# Install dependencies (if not done)
npm install

# Build application
npm run build

# Start in development mode
npm run dev

# Or start in production mode
npm start
```

Application should be running at: `http://localhost:3000`

## Step 5: Test the System (5 minutes)

### Create a Test Warrant

```bash
curl -X POST http://localhost:3000/api/warrants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "warrantNumber": "SW-2025-QUICKSTART-001",
    "warrantType": "search_warrant",
    "issuingAuthority": "Quick Start District Court",
    "issuedDate": "2025-01-15T00:00:00Z",
    "expiryDate": "2025-12-31T23:59:59Z",
    "jurisdiction": "US",
    "scopeDescription": "Quick start test warrant",
    "scopeConstraints": {
      "resourceTypes": ["investigation"],
      "allowedOperations": ["read", "export"],
      "purposes": ["investigation"]
    }
  }'
```

### Test Case Graph Access (Full Governance Flow)

```bash
# Test with all governance headers
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-Purpose: investigation" \
  -H "X-Legal-Basis: investigation" \
  -H "X-Reason-For-Access: Quick start test - verifying governance system" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { investigationCaseGraph(investigationId: \"test-inv-1\") { investigation { id title } governanceMetadata { purpose warrantId redactedFields } } }"
  }'
```

### Test Access Denial (Missing Warrant)

```bash
# Attempt to access restricted data without warrant
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "X-Purpose: investigation" \
  -H "X-Legal-Basis: investigation" \
  -H "X-Reason-For-Access: Testing denial path" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { investigationCaseGraph(investigationId: \"restricted-inv\") { investigation { id } } }"
  }'
```

Expected: 403 Forbidden with clear appeal guidance

### Submit Access Request (Appeal)

```bash
curl -X POST http://localhost:3000/api/access-requests \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "investigation",
    "resourceId": "restricted-inv",
    "requestedPurpose": "investigation",
    "justification": "I need access to this restricted investigation to analyze connections to case XYZ-123. My supervisor has verbally approved this access.",
    "requestedOperations": ["read"],
    "requestedSensitivity": "restricted"
  }'
```

### Query Audit Logs

```bash
curl -X POST http://localhost:3000/api/audit/query \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2025-01-15T00:00:00Z",
    "endTime": "2025-01-15T23:59:59Z",
    "limit": 10
  }'
```

## Step 6: View Dashboards (2 minutes)

### Prometheus Metrics

Open browser: `http://localhost:9090`

Try these queries:
- `opa_http_request_duration_seconds` - OPA performance
- `http_request_duration_ms` - API response times
- `audit_events_total` - Audit event counts

### Grafana Dashboards

Open browser: `http://localhost:3001`
- Username: `admin`
- Password: `admin` (or value from `.env`)

Pre-configured dashboards:
- **Governance Overview** - High-level metrics
- **OPA Performance** - Policy evaluation times
- **Audit Trail** - Compliance and access patterns
- **Warrant Usage** - Warrant lifecycle tracking

### Neo4j Browser

Open browser: `http://localhost:7474`
- Username: `neo4j`
- Password: `summit_dev_password`

Try these Cypher queries:
```cypher
// View policy tag distribution
MATCH (n)
WHERE EXISTS(n.policy_sensitivity)
RETURN n.policy_sensitivity as sensitivity, count(*) as count
ORDER BY count DESC

// Find restricted entities
MATCH (n)
WHERE n.policy_sensitivity = 'restricted'
RETURN n
LIMIT 10

// View entities by purpose
MATCH (n)
WHERE EXISTS(n.policy_purpose)
RETURN n.policy_purpose as purposes, count(*) as count
```

## Step 7: Run Tests (2 minutes)

```bash
# Run all governance tests
npm test -- governance-acceptance.test.ts

# Run specific test suite
npm test -- governance-acceptance.test.ts -t "Tenant Isolation"

# Run with coverage
npm test -- --coverage governance-acceptance.test.ts
```

Expected: All tests passing ✅

---

## Verification Checklist

- [ ] All Docker containers running (6 services)
- [ ] PostgreSQL tables created (7 tables)
- [ ] Neo4j policy tags added to nodes
- [ ] OPA health check passing
- [ ] Application started successfully
- [ ] Test warrant created
- [ ] GraphQL query with governance headers works
- [ ] Access denial returns clear appeal guidance
- [ ] Access request submitted successfully
- [ ] Audit logs queryable
- [ ] Prometheus metrics available
- [ ] Grafana dashboards loading
- [ ] Neo4j browser accessible
- [ ] All tests passing

---

## Troubleshooting

### OPA not responding

```bash
# Check OPA logs
docker logs summit-opa

# Restart OPA
docker-compose -f docker-compose.governance.yml restart opa

# Verify policies loaded
curl http://localhost:8181/v1/policies
```

### Database connection error

```bash
# Check PostgreSQL logs
docker logs summit-postgres

# Verify connection
psql $DATABASE_URL -c "SELECT version()"

# Check Neo4j logs
docker logs summit-neo4j
```

### Application not starting

```bash
# Check logs
npm run dev 2>&1 | tee app.log

# Verify environment variables
node -e "console.log(process.env)" | grep -E "(OPA|DATABASE|NEO4J|REDIS)"

# Check all services
docker-compose -f docker-compose.governance.yml ps
```

### Tests failing

```bash
# Run tests with verbose output
npm test -- --verbose governance-acceptance.test.ts

# Check test database
psql $TEST_DB_URL -c "\dt"

# Clear test data
npm run test:clean
```

---

## Next Steps

1. **Review Documentation**
   - `GOVERNANCE_README.md` - Complete user guide
   - `GOVERNANCE_DESIGN.md` - Architecture details
   - `GOVERNANCE_IMPLEMENTATION_CHECKLIST.md` - Full deployment guide

2. **Configure for Your Environment**
   - Update `.env` with production values
   - Configure OIDC for authentication
   - Set up HSM/KMS for key management
   - Enable database encryption

3. **Customize Policies**
   - Edit OPA policies in `policies/intelgraph/abac/`
   - Add custom access purposes
   - Define data retention policies
   - Configure compliance frameworks

4. **Set Up Monitoring**
   - Configure Prometheus alerts
   - Create custom Grafana dashboards
   - Set up log aggregation (ELK, Splunk)
   - Enable real-time notifications

5. **Deploy to Production**
   - Follow `GOVERNANCE_IMPLEMENTATION_CHECKLIST.md`
   - Phase 1: Foundation (Database + OPA)
   - Phase 2: Pilot (1-2 tenants)
   - Phase 3: Rollout (All tenants)
   - Phase 4: Full Enforcement

---

## Support

- **Documentation**: See `GOVERNANCE_README.md`
- **Issues**: Check `GOVERNANCE_IMPLEMENTATION_CHECKLIST.md` troubleshooting section
- **Questions**: Contact dev-team@example.com

---

## Summary

You now have a fully functional governance system with:

✅ **Multi-tenant isolation** with automatic query filtering
✅ **ABAC/RBAC** with externalized OPA policies
✅ **Policy tags** on all entities and relationships
✅ **Warrant management** with full lifecycle tracking
✅ **Comprehensive audit logging** (who/what/why/when)
✅ **Appeal system** for denied access
✅ **Monitoring dashboards** in Prometheus and Grafana
✅ **Acceptance tests** covering all Wishbook criteria

**Total time: ~15 minutes** 🎉

Ready to start using the governance system? Proceed to `GOVERNANCE_README.md` for API documentation and usage examples.
