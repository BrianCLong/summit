# Governance Implementation Checklist

This checklist guides you through deploying the complete governance, ABAC, and audit system for Summit.

## Pre-Deployment Checklist

### Environment Preparation
- [ ] Ensure PostgreSQL 12+ is running
- [ ] Ensure Neo4j 4.4+ is running
- [ ] Ensure Redis is running (for audit buffering)
- [ ] Install OPA (Open Policy Agent) server
- [ ] Set up environment variables (see below)
- [ ] Back up existing database

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/summit
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
REDIS_URL=redis://localhost:6379

# OPA
OPA_URL=http://localhost:8181
OPA_ENFORCEMENT=true

# JWT/Auth
JWT_SECRET=your-secret-key
JWT_ISSUER=intelgraph-platform
AUDIT_SIGNING_KEY=your-audit-signing-key
AUDIT_ENCRYPTION_KEY=your-audit-encryption-key

# Feature Flags (for gradual rollout)
FEATURE_POLICY_TAGS=true
FEATURE_WARRANTS=true
FEATURE_GOVERNANCE_HEADERS=false  # Start false for backward compatibility
FEATURE_WARRANT_ENFORCEMENT=false
FEATURE_IMMUTABLE_AUDIT=true

# Governance
GOVERNANCE_STRICT_MODE=false  # Start false, enable after migration
GOVERNANCE_MIN_REASON_LENGTH=10
```

---

## Phase 1: Foundation (Week 1-2)

### Database Migrations

#### PostgreSQL
- [ ] Review migration file: `server/src/migrations/001_governance_schema.sql`
- [ ] Run migration:
  ```bash
  psql $DATABASE_URL -f server/src/migrations/001_governance_schema.sql
  ```
- [ ] Verify tables created:
  ```bash
  psql $DATABASE_URL -c "\dt warrants warrant_usage access_purposes access_requests"
  ```
- [ ] Verify indexes created:
  ```bash
  psql $DATABASE_URL -c "\di idx_warrants_*"
  ```
- [ ] Verify pre-populated access purposes:
  ```bash
  psql $DATABASE_URL -c "SELECT purpose_code, purpose_name FROM access_purposes"
  ```

#### Neo4j
- [ ] Review migration file: `server/src/migrations/002_neo4j_policy_tags.ts`
- [ ] Run migration:
  ```bash
  npm run migrate:neo4j
  ```
- [ ] Verify policy tags added:
  ```cypher
  MATCH (n) WHERE EXISTS(n.policy_sensitivity)
  RETURN count(n) as nodes_with_tags
  ```
- [ ] Verify indexes created:
  ```cypher
  SHOW INDEXES
  ```

### OPA Deployment
- [ ] Install OPA:
  ```bash
  # macOS
  brew install opa

  # Linux
  curl -L -o /usr/local/bin/opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
  chmod +x /usr/local/bin/opa
  ```
- [ ] Copy policies to OPA directory:
  ```bash
  mkdir -p /etc/opa/policies
  cp -r policies/intelgraph /etc/opa/policies/
  ```
- [ ] Start OPA server:
  ```bash
  opa run --server --addr localhost:8181 /etc/opa/policies
  ```
- [ ] Verify OPA is running:
  ```bash
  curl http://localhost:8181/health
  ```
- [ ] Test policy:
  ```bash
  curl -X POST http://localhost:8181/v1/data/intelgraph/abac/allow \
    -H "Content-Type: application/json" \
    -d '{
      "input": {
        "user": {"tenant": "test", "roles": ["admin"]},
        "resource": {"tenant": "test", "type": "investigation"},
        "operation_type": "query"
      }
    }'
  ```

### Application Integration
- [ ] Install dependencies:
  ```bash
  npm install
  ```
- [ ] Build application:
  ```bash
  npm run build
  ```
- [ ] Run tests:
  ```bash
  npm test
  ```
- [ ] Start application in dev mode:
  ```bash
  npm run dev
  ```

---

## Phase 2: Pilot (Week 3-4)

### Enable for 1-2 Tenants (Opt-in)

- [ ] Select pilot tenants (recommend 1-2 friendly tenants)
- [ ] Notify pilot users of new governance features
- [ ] Provide training on new headers:
  - `X-Purpose`
  - `X-Legal-Basis`
  - `X-Warrant-Id`
  - `X-Reason-For-Access`

### Create Test Warrants
- [ ] Create test warrant for pilot tenant:
  ```bash
  curl -X POST http://localhost:3000/api/warrants \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "warrantNumber": "SW-2025-PILOT-001",
      "warrantType": "search_warrant",
      "issuingAuthority": "District Court",
      "issuedDate": "2025-01-15T00:00:00Z",
      "expiryDate": "2025-12-31T23:59:59Z",
      "jurisdiction": "US",
      "scopeDescription": "Pilot warrant for testing governance system",
      "scopeConstraints": {
        "resourceTypes": ["investigation", "entity", "evidence"],
        "allowedOperations": ["read", "export"],
        "purposes": ["investigation", "threat_intel"]
      },
      "tenantId": "pilot-tenant-1",
      "createdBy": "system-admin"
    }'
  ```

### Test Case Graph Access
- [ ] Test with all governance headers:
  ```bash
  curl -X POST http://localhost:3000/graphql \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "X-Purpose: investigation" \
    -H "X-Legal-Basis: investigation" \
    -H "X-Warrant-Id: warrant-uuid" \
    -H "X-Reason-For-Access: Reviewing case details for investigation XYZ-123" \
    -d '{
      "query": "query { investigationCaseGraph(investigationId: \"inv-123\") { investigation { id } } }"
    }'
  ```
- [ ] Test without warrant (should deny for restricted data):
  ```bash
  curl -X POST http://localhost:3000/graphql \
    -H "Authorization: Bearer $USER_TOKEN" \
    -H "X-Purpose: investigation" \
    -H "X-Reason-For-Access: Need access" \
    -d '{
      "query": "query { investigationCaseGraph(investigationId: \"restricted-inv\") { investigation { id } } }"
    }'
  ```
- [ ] Verify audit logs:
  ```sql
  SELECT * FROM audit_events
  WHERE tenant_id = 'pilot-tenant-1'
  ORDER BY timestamp DESC
  LIMIT 10;
  ```

### Monitor Performance
- [ ] Check OPA response times:
  ```bash
  curl http://localhost:8181/metrics
  ```
- [ ] Check database performance:
  ```sql
  SELECT schemaname, tablename, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  AND tablename IN ('warrants', 'warrant_usage', 'audit_events')
  ORDER BY idx_scan DESC;
  ```
- [ ] Monitor application logs for errors
- [ ] Check audit log flush performance

### Gather Feedback
- [ ] Survey pilot users on:
  - Ease of use
  - Performance impact
  - Clarity of error messages
  - Appeal process understanding
- [ ] Document issues and improvements
- [ ] Iterate on policies based on feedback

---

## Phase 3: Gradual Rollout (Week 5-8)

### Enable for All New Investigations
- [ ] Set feature flag:
  ```bash
  FEATURE_GOVERNANCE_HEADERS=true
  ```
- [ ] Update API documentation
- [ ] Send notification to all users
- [ ] Provide training materials

### Backfill Policy Tags for Existing Data
- [ ] Run backfill script:
  ```bash
  npm run backfill:policy-tags
  ```
- [ ] Monitor progress:
  ```cypher
  MATCH (n)
  RETURN
    count(n) as total_nodes,
    count(CASE WHEN EXISTS(n.policy_sensitivity) THEN 1 END) as tagged_nodes,
    (count(CASE WHEN EXISTS(n.policy_sensitivity) THEN 1 END) * 100.0 / count(n)) as percent_complete
  ```
- [ ] Verify data quality:
  ```cypher
  MATCH (n)
  WHERE EXISTS(n.policy_sensitivity)
  RETURN n.policy_sensitivity as sensitivity, count(*) as count
  ORDER BY count DESC
  ```

### Make Governance Headers Required for Sensitive Operations
- [ ] Update middleware configuration:
  ```typescript
  const governanceMiddleware = createGovernanceMiddleware(db, warrantService, logger, {
    requirePurpose: true,
    requireReason: true,
    strictMode: false, // Still permissive with defaults
  });
  ```
- [ ] Monitor error rates
- [ ] Provide clear error messages

### Train Users on Access Request Process
- [ ] Create access request form
- [ ] Document approval workflow
- [ ] Train compliance officers
- [ ] Set up notification system for access requests

---

## Phase 4: Full Enforcement (Week 9-12)

### Enforce Warrant Requirements for Restricted Data
- [ ] Enable feature flag:
  ```bash
  FEATURE_WARRANT_ENFORCEMENT=true
  ```
- [ ] Update OPA policies to enforce warrant checks
- [ ] Test warrant validation thoroughly
- [ ] Monitor warrant usage rates

### Make Reason-for-Access Mandatory
- [ ] Enable strict mode:
  ```typescript
  const governanceMiddleware = createGovernanceMiddleware(db, warrantService, logger, {
    requirePurpose: true,
    requireReason: true,
    strictMode: true, // No more defaults
  });
  ```
- [ ] Remove backward compatibility middleware
- [ ] Update all API clients
- [ ] Monitor for issues

### Enable Immutable Audit Log
- [ ] Verify triggers are in place:
  ```sql
  SELECT * FROM pg_trigger
  WHERE tgname LIKE '%audit%';
  ```
- [ ] Test update prevention:
  ```sql
  -- This should fail
  UPDATE audit_events SET message = 'test' WHERE id = 'some-id';
  ```
- [ ] Set up audit log archival (if needed)

### Complete OIDC Integration
- [ ] Implement OIDC issuer verification (opa-abac.ts:161)
- [ ] Test with real OIDC provider
- [ ] Update token validation
- [ ] Remove development mode bypass

### Continuous Monitoring and Optimization
- [ ] Set up dashboards for:
  - Policy evaluation times
  - Warrant usage rates
  - Access denial rates
  - Audit log sizes
  - Compliance scores
- [ ] Set up alerts for:
  - OPA server down
  - Audit log write failures
  - High denial rates
  - Policy evaluation > 100ms
- [ ] Regular compliance reports
- [ ] Weekly review of access requests

---

## Post-Deployment Tasks

### Documentation
- [ ] Update API documentation with governance headers
- [ ] Create user guide for warrant requests
- [ ] Document appeal process
- [ ] Create compliance officer handbook
- [ ] Update developer onboarding docs

### Security Hardening
- [ ] Enable HSM/KMS for key management
- [ ] Enable database encryption at rest
- [ ] Set up append-only audit storage (e.g., AWS S3 with object lock)
- [ ] Implement log forwarding to SIEM
- [ ] Enable MFA for admin accounts

### Compliance Validation
- [ ] Run full compliance report:
  ```bash
  npm run compliance:report -- --framework SOX --start-date 2025-01-01 --end-date 2025-12-31
  ```
- [ ] Verify audit trail integrity:
  ```bash
  npm run audit:verify-integrity
  ```
- [ ] Generate forensic analysis report
- [ ] Schedule regular compliance reviews

### Performance Optimization
- [ ] Review slow queries:
  ```sql
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  WHERE query LIKE '%warrant%' OR query LIKE '%audit%'
  ORDER BY mean_exec_time DESC
  LIMIT 10;
  ```
- [ ] Add missing indexes if needed
- [ ] Optimize OPA policy bundle
- [ ] Tune audit log flush interval

---

## Rollback Plan

If issues arise, follow this rollback procedure:

### Emergency Rollback (< 1 hour)
1. [ ] Disable feature flags:
   ```bash
   FEATURE_GOVERNANCE_HEADERS=false
   FEATURE_WARRANT_ENFORCEMENT=false
   ```
2. [ ] Restart application
3. [ ] Enable backward compatibility middleware
4. [ ] Monitor for stability

### Full Rollback (if needed)
1. [ ] Stop OPA server
2. [ ] Rollback Neo4j migration:
   ```bash
   npm run migrate:neo4j:down
   ```
3. [ ] Rollback PostgreSQL migration:
   ```sql
   DROP TABLE IF EXISTS warrant_usage CASCADE;
   DROP TABLE IF EXISTS warrants CASCADE;
   DROP TABLE IF EXISTS access_requests CASCADE;
   DROP TABLE IF EXISTS access_purposes CASCADE;
   DROP TABLE IF EXISTS policy_tag_metadata CASCADE;
   ```
4. [ ] Remove governance middleware
5. [ ] Deploy previous version
6. [ ] Notify users

---

## Success Criteria

### Technical Metrics
- [ ] Policy evaluation time < 50ms (p95)
- [ ] Audit log write latency < 10ms (p95)
- [ ] 100% of resource access logged
- [ ] Audit trail integrity verification passing
- [ ] Zero unauthorized access incidents

### Business Metrics
- [ ] Policy denial rate < 5%
- [ ] Average access request response time < 24 hours
- [ ] Compliance score > 95% for all frameworks
- [ ] User satisfaction score > 80%
- [ ] Zero data breach incidents

### Compliance Metrics
- [ ] 100% of warrant usage tracked
- [ ] 100% of restricted data access has legal basis
- [ ] All access has reason-for-access recorded
- [ ] Audit trail covers all who/what/why/when
- [ ] Appeal process documented and functioning

---

## Support Contacts

### Technical Issues
- Development Team: dev-team@example.com
- DevOps: devops@example.com

### Compliance Issues
- Compliance Officer: compliance@example.com
- Legal Team: legal@example.com

### Access Requests
- Submit via: /api/access-requests
- Email: access-requests@example.com
- SLA: 24 hours for review

---

## Maintenance Schedule

### Daily
- [ ] Check OPA server health
- [ ] Monitor audit log sizes
- [ ] Review high-severity audit events

### Weekly
- [ ] Review access denial reports
- [ ] Process pending access requests
- [ ] Review warrant expiry dates
- [ ] Generate weekly compliance summary

### Monthly
- [ ] Run full compliance reports
- [ ] Audit trail integrity verification
- [ ] Performance optimization review
- [ ] Policy update review

### Quarterly
- [ ] Comprehensive security audit
- [ ] User training refresh
- [ ] Policy effectiveness review
- [ ] Disaster recovery drill

---

## Additional Resources

- **Governance Design**: `GOVERNANCE_DESIGN.md`
- **OPA Policies**: `policies/intelgraph/abac/`
- **Migrations**: `server/src/migrations/`
- **Tests**: `server/tests/governance-acceptance.test.ts`
- **API Docs**: https://docs.intelgraph.example.com/api
- **OPA Documentation**: https://www.openpolicyagent.org/docs/latest/
