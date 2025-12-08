# Service Catalog-Ready Checklist

> **Version:** 1.0.0
> **Last Updated:** 2025-12-07
> **Status:** Active
> **Owner:** Platform Engineering

A service is **catalog-ready** when it meets all requirements for its tier. Use this checklist to verify your service before production deployment.

---

## Quick Reference

| Tier | Required Sections |
|------|------------------|
| **Critical** | ALL sections required |
| **High** | Sections 1-8 required |
| **Medium** | Sections 1-5 required |
| **Low** | Section 1 required |

---

## Section 1: Identity & Ownership (ALL TIERS)

### Service Identity

- [ ] **Service ID**: Unique, kebab-case, 3-50 characters
  ```
  ✅ graph-core
  ✅ api-gateway
  ❌ GraphCore (no PascalCase)
  ❌ my_service (no underscores)
  ```

- [ ] **Display Name**: Human-readable name defined

- [ ] **Description**: 2-3 sentence description that explains:
  - What the service does
  - What business capability it enables
  - Who uses it

- [ ] **Service Type**: One of: `api`, `worker`, `cron`, `data-pipeline`, `gateway`, `ui`

- [ ] **Service Tier**: Correctly assigned based on:
  - `critical`: Business-critical, outage = major incident
  - `high`: Important, outage = significant impact
  - `medium`: Standard, outage = limited impact
  - `low`: Best-effort, experimental, or internal tools

- [ ] **Lifecycle State**: One of: `experimental`, `beta`, `ga`, `deprecated`, `sunset`

### Ownership

- [ ] **Primary Owner**: Team ID exists in org graph
- [ ] **Backup Owner**: Different team from primary, exists in org graph
- [ ] **Slack Channel**: Valid channel, team is active there
- [ ] **Email**: Valid distribution list or team email
- [ ] **Last Ownership Review**: Within past 90 days

**Verification:**
```bash
# Check ownership validity
summit catalog validate --service=<service-id> --section=ownership
```

---

## Section 2: Technical Details (ALL TIERS)

- [ ] **Language**: Specified (typescript, python, go, rust, java, other)

- [ ] **Runtime**: Version specified (e.g., node-20, python-3.11)

- [ ] **Repository**: Valid path to source code

- [ ] **Entry Point**: Main file path exists and is correct

- [ ] **Build Passes**: Service builds successfully
  ```bash
  pnpm build --filter=@summit/<service-id>
  ```

- [ ] **Tests Pass**: Unit tests pass
  ```bash
  pnpm test --filter=@summit/<service-id>
  ```

---

## Section 3: Deployment (ALL TIERS)

- [ ] **Deployment Status**: Accurately reflects current state

- [ ] **Namespace**: Kubernetes namespace exists

- [ ] **Health Endpoints**:
  - [ ] Liveness probe: `GET /health/live` returns 200
  - [ ] Readiness probe: `GET /health/ready` returns 200

- [ ] **Containerized**: Dockerfile exists and builds successfully

- [ ] **Resource Limits**: CPU and memory limits defined
  ```yaml
  resources:
    requests:
      cpu: 100m      # Minimum required
      memory: 256Mi
    limits:
      cpu: 1000m     # Maximum allowed
      memory: 1Gi
  ```

**Verification:**
```bash
# Test health endpoints locally
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready

# Build container
docker build -t <service-id>:test .
```

---

## Section 4: Interfaces (ALL TIERS)

### API Definition

- [ ] **Interface Type**: Specified (graphql, rest, grpc, event, websocket)

- [ ] **API Version**: Version specified (v1, v2, etc.)

- [ ] **Spec Available**: OpenAPI/GraphQL schema accessible
  - REST: `/openapi.json` or `/swagger.json`
  - GraphQL: Schema introspection enabled or SDL file

- [ ] **Authentication**: Method(s) specified
  - [ ] JWT validation works
  - [ ] mTLS configured (if applicable)
  - [ ] API key validation (if applicable)

- [ ] **Authorization**: OPA policy path defined (if applicable)

### Rate Limiting

- [ ] **Rate Limits Defined**: requests_per_second, burst_size
- [ ] **Rate Limiting Implemented**: Returns 429 when exceeded

**Verification:**
```bash
# Check API spec
curl http://localhost:3000/openapi.json | jq .info.version

# Test authentication
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/health
```

---

## Section 5: Dependencies (ALL TIERS)

- [ ] **All Dependencies Listed**: Every service/database called is documented

- [ ] **Dependency Type**: Specified for each (sync, async, data, configuration)

- [ ] **Critical Dependencies Identified**: `is_critical: true` for hard dependencies

- [ ] **Fallback Behavior Documented**: What happens when each dependency is unavailable

- [ ] **Circuit Breakers**: Implemented for critical sync dependencies

**Verification:**
```bash
# List actual dependencies from code
summit catalog analyze-deps --service=<service-id>

# Compare with declared dependencies
summit catalog validate --service=<service-id> --section=dependencies
```

---

## Section 6: SLOs (TIER: critical, high)

### Availability SLO

- [ ] **Target Defined**: Percentage (e.g., 99.9%)
- [ ] **Measurement Window**: Specified (e.g., 30d)
- [ ] **Prometheus Query**: Query exists to measure availability

### Latency SLO

- [ ] **P50 Target**: Defined in milliseconds
- [ ] **P95 Target**: Defined in milliseconds
- [ ] **P99 Target**: Defined in milliseconds
- [ ] **Histogram Metrics**: `_bucket` metrics exposed for percentile calculation

### Error Rate SLO

- [ ] **Target Defined**: Percentage (e.g., 0.1%)
- [ ] **Error Tracking**: 5xx errors tracked in metrics

### SLO Dashboard

- [ ] **Grafana Dashboard**: Created with SLO panels
- [ ] **Error Budget**: Visible and calculated
- [ ] **Alerting**: Alerts configured for SLO breach

**Verification:**
```bash
# Check SLO metrics exist
curl http://localhost:3000/metrics | grep -E "(http_requests_total|http_request_duration)"

# Verify dashboard
summit catalog validate --service=<service-id> --section=slo
```

---

## Section 7: Observability (TIER: critical, high)

### Metrics

- [ ] **Prometheus Endpoint**: `/metrics` returns Prometheus format
- [ ] **Request Metrics**: `http_requests_total` with labels (method, status, path)
- [ ] **Latency Histogram**: `http_request_duration_seconds` histogram
- [ ] **Custom Metrics**: Business-specific metrics defined

### Logging

- [ ] **Structured Logging**: JSON format
- [ ] **Log Levels**: Configurable via environment variable
- [ ] **Request ID**: Correlation ID in every log
- [ ] **Sensitive Data Redacted**: PII not logged

### Tracing

- [ ] **OpenTelemetry**: Instrumented with OTel SDK
- [ ] **Trace Context**: W3C trace context propagated
- [ ] **Spans**: Key operations have spans
- [ ] **Trace ID in Logs**: Trace ID included in log entries

### Dashboards

- [ ] **Grafana Dashboard UID**: Specified in catalog
- [ ] **Key Panels**:
  - [ ] Request rate
  - [ ] Error rate
  - [ ] Latency percentiles
  - [ ] Resource utilization

**Verification:**
```bash
# Check metrics endpoint
curl http://localhost:3000/metrics | head -50

# Verify logging format
docker logs <container-id> --tail=10 | jq .

# Check tracing
curl -H "traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01" \
     http://localhost:3000/api/v1/health
```

---

## Section 8: Documentation & Runbooks (TIER: critical, high)

### Documentation

- [ ] **README**: Exists in service directory
- [ ] **Architecture Doc**: Service architecture documented
- [ ] **API Documentation**: Auto-generated or manual API docs
- [ ] **Configuration Reference**: All env vars documented

### Runbooks

- [ ] **At Least One Runbook**: For common failure modes
- [ ] **Runbook Path**: Correct path in catalog entry
- [ ] **Runbook Content**:
  - [ ] Symptoms described
  - [ ] Diagnostic steps
  - [ ] Resolution steps
  - [ ] Escalation path

### Required Runbooks for Critical Services

- [ ] **High Memory Usage**: Memory troubleshooting
- [ ] **High CPU Usage**: CPU troubleshooting
- [ ] **High Error Rate**: Error investigation
- [ ] **Dependency Failure**: Each critical dependency
- [ ] **Restart Procedure**: Safe restart steps
- [ ] **Rollback Procedure**: How to rollback deployment

**Verification:**
```bash
# Check documentation exists
ls -la docs/services/<service-id>/
ls -la runbooks/<service-id>/

# Validate runbook links
summit catalog validate --service=<service-id> --section=documentation
```

---

## Section 9: On-Call & Incidents (TIER: critical, high)

- [ ] **On-Call Schedule**: PagerDuty schedule exists and is staffed

- [ ] **Escalation Policy**: Defined with appropriate levels

- [ ] **Alert Rules**: Prometheus/Alertmanager rules configured

- [ ] **Alert Routing**: Alerts route to correct PagerDuty service

- [ ] **Incident Response**:
  - [ ] Team trained on incident process
  - [ ] Runbooks accessible to on-call
  - [ ] Communication channels established

**Verification:**
```bash
# Check PagerDuty schedule
summit catalog validate --service=<service-id> --section=oncall

# Test alert routing (in staging)
summit catalog test-alert --service=<service-id> --severity=warning
```

---

## Section 10: Data Classification (TIER: critical, high, medium)

- [ ] **Data Classes Identified**: PII, PHI, financial, confidential, public

- [ ] **Data Residency**: Required regions specified

- [ ] **Retention Policy**: Policy identifier specified

- [ ] **Encryption at Rest**: Enabled if required by data class

- [ ] **Encryption in Transit**: TLS enforced

- [ ] **PII Handling**: If PII present:
  - [ ] DLP middleware enabled
  - [ ] Audit logging for PII access
  - [ ] DSAR support implemented
  - [ ] RTBF support implemented

**Verification:**
```bash
# Scan for PII in logs/responses
summit security scan-pii --service=<service-id>

# Verify encryption
summit catalog validate --service=<service-id> --section=security
```

---

## Section 11: Security (TIER: critical, high)

- [ ] **Vulnerability Scanning**: Container scanning enabled in CI

- [ ] **Security Review**: Completed within past year

- [ ] **Network Policies**: Ingress/egress rules defined

- [ ] **Secrets Management**: No hardcoded secrets
  - [ ] Secrets from Vault/Kubernetes secrets
  - [ ] No secrets in environment variables (use secret refs)

- [ ] **HTTPS Only**: No HTTP endpoints (except health checks)

- [ ] **Input Validation**: All inputs validated
  - [ ] Request body validation
  - [ ] Query parameter validation
  - [ ] Header validation

- [ ] **Output Encoding**: Prevent injection attacks

**Verification:**
```bash
# Run security scan
trivy image <service-id>:latest

# Check for secrets
gitleaks detect --source=services/<service-id>

# Validate network policy
kubectl get networkpolicy -n <namespace> | grep <service-id>
```

---

## Section 12: Compliance (TIER: critical, high)

- [ ] **Compliance Frameworks**: Listed (SOC2, GDPR, HIPAA, etc.)

- [ ] **Audit Logging**: All mutations logged

- [ ] **Access Logging**: All access attempts logged

- [ ] **Data Retention**: Follows retention policy

- [ ] **DSAR Support**: Data subject access requests handled

- [ ] **RTBF Support**: Right to be forgotten implemented

**Verification:**
```bash
# Check audit logs
summit compliance audit-check --service=<service-id>

# Test DSAR endpoint
curl -X POST http://localhost:3000/api/v1/dsar/export -d '{"subject_id": "test"}'
```

---

## Final Validation

Run the complete validation suite:

```bash
# Full validation for all sections
summit catalog validate --service=<service-id> --all

# Tier-specific validation
summit catalog validate --service=<service-id> --tier=critical

# Generate report
summit catalog validate --service=<service-id> --report=html > validation-report.html
```

### Validation Output

```
Service Catalog Validation: graph-core
======================================

✅ Section 1: Identity & Ownership      [PASS]
✅ Section 2: Technical Details         [PASS]
✅ Section 3: Deployment                [PASS]
✅ Section 4: Interfaces                [PASS]
✅ Section 5: Dependencies              [PASS]
✅ Section 6: SLOs                      [PASS]
✅ Section 7: Observability             [PASS]
✅ Section 8: Documentation & Runbooks  [PASS]
✅ Section 9: On-Call & Incidents       [PASS]
✅ Section 10: Data Classification      [PASS]
✅ Section 11: Security                 [PASS]
✅ Section 12: Compliance               [PASS]

Overall: CATALOG READY ✅
Tier: critical
Last Validated: 2025-12-07T10:30:00Z
```

---

## Checklist Summary by Tier

### Critical Tier (14 services)

Must pass ALL sections (1-12).

```markdown
## Critical Service Checklist

### Identity & Ownership
- [ ] Service ID, name, description
- [ ] Primary + backup + escalation owner
- [ ] On-call schedule (PagerDuty)
- [ ] Ownership review < 90 days

### Technical & Deployment
- [ ] Build + tests pass
- [ ] Container builds
- [ ] Health endpoints work
- [ ] Resource limits set

### Interfaces & Dependencies
- [ ] API spec available
- [ ] Auth configured
- [ ] All dependencies documented
- [ ] Circuit breakers implemented

### SLOs & Observability
- [ ] Availability SLO (99.9%+)
- [ ] Latency SLO (P50, P95, P99)
- [ ] Prometheus metrics
- [ ] Grafana dashboard
- [ ] Distributed tracing

### Documentation & Runbooks
- [ ] README + architecture docs
- [ ] Runbooks for all failure modes
- [ ] API documentation

### Security & Compliance
- [ ] Security review completed
- [ ] Vulnerability scanning
- [ ] Audit logging
- [ ] Data classification
- [ ] Compliance frameworks
```

### High Tier (32 services)

Must pass Sections 1-9.

### Medium Tier (108 services)

Must pass Sections 1-5, 10.

### Low Tier (171 services)

Must pass Section 1.

---

## Common Failures & Fixes

| Failure | Fix |
|---------|-----|
| Missing primary owner | Add `ownership.primary_owner` with valid team ID |
| Stale ownership review | Update `ownership.last_ownership_review` date |
| No health endpoint | Add `/health/live` and `/health/ready` endpoints |
| Missing SLO targets | Define `slo.availability.target` and latency targets |
| No metrics endpoint | Add Prometheus middleware at `/metrics` |
| Missing runbook | Create runbook in `/runbooks/<service-id>/` |
| No PagerDuty schedule | Create schedule and add `ownership.oncall_schedule` |
| Dependencies not declared | Run `summit catalog analyze-deps` and add to catalog |

---

## Related Documents

- [SERVICE_ENTRY_TEMPLATE.yaml](./SERVICE_ENTRY_TEMPLATE.yaml) - Template for new services
- [SERVICE_CATALOG_DATA_MODEL.md](./SERVICE_CATALOG_DATA_MODEL.md) - Data model reference
- [OWNERSHIP_PATTERNS.md](./OWNERSHIP_PATTERNS.md) - Ownership requirements
- [SERVICE_CATALOG_V0.md](./SERVICE_CATALOG_V0.md) - Catalog overview
