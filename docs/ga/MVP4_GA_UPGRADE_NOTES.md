# Summit MVP-4 GA Upgrade Notes

**From Version:** 3.0.0
**To Version:** 4.0.0-ga
**Classification:** Internal

---

## Pre-Upgrade Checklist

Before upgrading to MVP-4 GA, complete the following steps:

### Environment Verification

- [ ] Node.js 20 LTS installed
- [ ] PostgreSQL 14+ available
- [ ] Neo4j 5.x available
- [ ] Redis 7.x available
- [ ] OPA 0.60+ installed

### Backup Procedures

- [ ] Database backups completed (PostgreSQL, Neo4j)
- [ ] Configuration files backed up
- [ ] Policy files backed up
- [ ] PITR enabled for PostgreSQL

### Team Readiness

- [ ] On-call team notified
- [ ] Rollback plan reviewed (`docs/ga/ROLLBACK.md`)
- [ ] War room established (for production upgrades)

---

## Breaking Changes

### 1. DataEnvelope Response Wrapper

**What Changed:**
All API responses are now wrapped in a `DataEnvelope` structure that includes governance metadata.

**Previous Format:**
```json
{
  "id": "entity-123",
  "name": "Example Entity"
}
```

**New Format:**
```json
{
  "data": {
    "id": "entity-123",
    "name": "Example Entity"
  },
  "governance": {
    "verdict": "ALLOW",
    "policyVersion": "v4.0.0",
    "evaluatedAt": "2025-12-30T10:00:00Z"
  },
  "metadata": {
    "requestId": "req-456",
    "tenantId": "tenant-789"
  }
}
```

**Migration Steps:**
1. Update API client code to extract data from `response.data`
2. Update error handling to check `response.governance.verdict`
3. Update logging to include `response.metadata.requestId`

### 2. GovernanceVerdict on AI Outputs

**What Changed:**
All AI/LLM outputs include a `GovernanceVerdict` object with decision reasoning.

**Impact:**
- AI response payloads are larger
- Clients must handle verdict objects
- Blocked outputs include appeal information

**Migration Steps:**
1. Update AI response handlers to parse verdict objects
2. Implement UI for displaying governance decisions
3. Add handling for `DENY` verdicts with user guidance

### 3. Authentication Token Format

**What Changed:**
JWT tokens include additional claims for tenant context and clearance levels.

**New Claims:**
```json
{
  "sub": "user-id",
  "tenantId": "tenant-123",
  "roles": ["analyst"],
  "clearance": "confidential",
  "entitlements": ["workflow:execute"]
}
```

**Migration Steps:**
1. Update token generation to include new claims
2. Update token validation to extract tenant context
3. Update authorization logic to use new claim structure

### 4. Policy Format Update

**What Changed:**
Policies updated to Rego v1 syntax with `future.keywords` imports.

**Previous Format:**
```rego
allow {
  input.user.role == "admin"
}
```

**New Format:**
```rego
import future.keywords.if

allow if {
  input.user.role == "admin"
}
```

**Migration Steps:**
1. Update custom policies to use `future.keywords`
2. Run `opa check policies/` to validate syntax
3. Test policies with `opa test policies/ -v`

---

## Configuration Changes

### New Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPA_URL` | Yes | - | OPA server URL |
| `RATE_LIMIT_WINDOW_MS` | No | 900000 | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | 100 | Max requests per window |
| `AI_RATE_LIMIT_MAX_REQUESTS` | No | 50 | AI endpoint rate limit |
| `AUDIT_RETENTION_YEARS` | No | 7 | Audit log retention |
| `CORS_ORIGIN` | Yes (prod) | - | Comma-separated allowed origins |

### Updated Configuration Files

**config/production.json:**
```json
{
  "security": {
    "rateLimit": {
      "windowMs": 900000,
      "maxRequests": 100
    },
    "cors": {
      "origins": ["https://app.example.com"]
    }
  },
  "governance": {
    "policyPath": "policies/",
    "defaultDeny": true,
    "evaluationTimeout": 10000
  }
}
```

---

## Database Migrations

### PostgreSQL Migrations

**Migration: Add audit_entries table**
```sql
CREATE TABLE IF NOT EXISTS audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  outcome VARCHAR(50) NOT NULL,
  user_id VARCHAR(255),
  tenant_id VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  policy_version VARCHAR(50),
  signature BYTEA,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT no_updates CHECK (TRUE)
);

CREATE INDEX idx_audit_tenant_time ON audit_entries (tenant_id, created_at);
CREATE INDEX idx_audit_user_time ON audit_entries (user_id, created_at);
```

### Neo4j Migrations

**Add governance labels:**
```cypher
CREATE CONSTRAINT governance_decision_id IF NOT EXISTS
FOR (d:GovernanceDecision) REQUIRE d.id IS UNIQUE;

CREATE INDEX governance_tenant_time IF NOT EXISTS
FOR (d:GovernanceDecision) ON (d.tenantId, d.timestamp);
```

---

## Upgrade Procedure

### Phase 1: Preparation (T-24h)

1. **Notify stakeholders**
2. **Backup databases**
   ```bash
   pg_dump -Fc summit > summit_backup_$(date +%Y%m%d).dump
   neo4j-admin dump --database=neo4j --to=/backups/neo4j_$(date +%Y%m%d).dump
   ```
3. **Verify rollback capability**

### Phase 2: Deployment (T-0)

1. **Enable maintenance mode**
2. **Run database migrations**: `pnpm db:migrate`
3. **Deploy new version**
4. **Deploy OPA policies**
5. **Verify deployment**

### Phase 3: Verification (T+1h)

1. **Run smoke tests**
2. **Verify policy evaluation**
3. **Check audit logging**

### Phase 4: Monitoring (T+72h)

- Monitor error rates hourly
- Check SLO dashboards
- Review audit logs for anomalies

---

## Rollback Procedure

**Quick Rollback:**
```bash
kubectl rollout undo deployment/summit
kubectl rollout status deployment/summit
```

See `docs/ga/ROLLBACK.md` for full rollback procedures.

---

## Verification Commands

```bash
# Health checks
curl -s localhost:3000/health
curl -s localhost:3000/health/detailed

# Policy verification
opa check policies/
opa test policies/ -v

# Build verification
pnpm typecheck
pnpm lint --max-warnings 0
```

---

## Support Resources

| Resource | Location |
|----------|----------|
| Deployment Guide | `docs/ga/DEPLOYMENT.md` |
| Rollback Guide | `docs/ga/ROLLBACK.md` |
| Security Baseline | `docs/ga/SECURITY_BASELINE.md` |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
