# Self-Service Incident Diagnosis Runbook

**Document ID:** GA-E6-RUN-001
**Version:** 1.0
**Date:** 2025-12-27
**Status:** Active
**Owner:** Platform Operations Team

## Overview

This runbook provides step-by-step procedures for operators to diagnose and troubleshoot common incidents in the Summit platform using correlation IDs, structured logs, and Grafana dashboards.

## Prerequisites

- Access to Grafana dashboards
- Access to log aggregation system (Loki/Elasticsearch)
- SSH access to application servers (for local log files)
- Basic understanding of correlation IDs and structured logging

## Quick Reference

| Incident Type         | First Step                              | Key Tool             |
| --------------------- | --------------------------------------- | -------------------- |
| API Errors            | Get correlation ID from response header | Grafana Log Search   |
| Slow Requests         | Check latency dashboard                 | Grafana Metrics      |
| AI Copilot Issues     | Review AI metrics panel                 | AI Copilot Dashboard |
| Governance Failures   | Check verdict distribution              | Governance Panel     |
| Authentication Errors | Search audit logs                       | Audit Log System     |

## Common Incident Types

### 1. API Error (5xx Status Code)

**Symptoms**: User reports error, API returning 5xx status codes

**Diagnosis Steps**:

1. **Obtain Correlation ID**

   ```bash
   # From error response header
   X-Correlation-ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```

2. **Open Grafana Dashboard**
   - Navigate to "Summit Operations - Self-Service Diagnostics"
   - Enter correlation ID in template variable at top
   - Review "Request Flow by Correlation ID" panel

3. **Analyze Request Flow**

   ```logql
   # In Grafana Explore or dashboard
   {service="summit-api"}
     | json
     | correlationId="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   ```

4. **Identify Error Point**
   - Look for log entries with `level=50` (error) or `level=60` (fatal)
   - Examine `error.message` and `error.stack` fields
   - Note the operation/service where error occurred

5. **Check Error Patterns**

   ```promql
   # Check if this is a widespread issue
   sum(rate(http_requests_total{
     service="summit-api",
     status=~"5..",
     path="/api/affected-endpoint"
   }[5m]))
   ```

6. **Root Cause Analysis**
   - Database connection issues → Check DB metrics
   - Timeout errors → Check downstream service latency
   - Validation errors → Review request payload in logs
   - Permission errors → Check auth/authz logs

**Resolution Paths**:

- Database issues → Escalate to DBA team
- Service dependency → Check service health dashboard
- Application error → Create bug ticket with correlation ID
- Configuration issue → Review recent config changes

**Example Log Query** (local files):

```bash
# Search structured logs
cat /logs/app-structured.log | \
  jq 'select(.correlationId == "a1b2c3d4-e5f6-7890-abcd-ef1234567890")' | \
  jq -s 'sort_by(.time)' | \
  jq '.[] | {time, level, message, error}'

# Quick error search
grep "correlationId\":\"a1b2c3d4" /logs/app-structured.log | grep "\"level\":50"
```

---

### 2. High Latency / Slow Requests

**Symptoms**: User reports slow response, timeout errors

**Diagnosis Steps**:

1. **Check Dashboard Metrics**
   - Open "Request Latency by Endpoint" panel
   - Identify affected endpoints with high p95/p99

2. **Obtain Correlation ID from Slow Request**

   ```bash
   # From response header or user report
   X-Correlation-ID: <correlation-id>
   ```

3. **Analyze Request Timeline**

   ```bash
   # Local log search with timestamps
   cat /logs/app-structured.log | \
     jq 'select(.correlationId == "<correlation-id>")' | \
     jq -s 'sort_by(.time)' | \
     jq '.[] | {time, message, duration}'
   ```

4. **Identify Bottlenecks**
   - Look for long durations between log entries
   - Check for database query times in logs
   - Review external API call latencies
   - Examine cache hit/miss patterns

5. **Check System Resources**

   ```promql
   # CPU usage
   rate(process_cpu_seconds_total{service="summit-api"}[5m])

   # Memory usage
   process_resident_memory_bytes{service="summit-api"}

   # Active connections
   sum(http_requests_in_flight{service="summit-api"})
   ```

6. **Correlate with Load**
   ```promql
   # Request rate during incident
   sum(rate(http_requests_total{service="summit-api"}[5m]))
   ```

**Resolution Paths**:

- Database slow queries → Add indexes, optimize queries
- High load → Scale horizontally, enable rate limiting
- External API slow → Add circuit breaker, caching
- Memory pressure → Increase pod resources, investigate leaks

**Performance Tracing**:

```bash
# OpenTelemetry trace lookup
curl -H "Authorization: Bearer $TOKEN" \
  "http://jaeger:16686/api/traces/<trace-id>"
```

---

### 3. AI Copilot Errors or Timeouts

**Symptoms**: AI operations failing, timeouts, or poor quality responses

**Diagnosis Steps**:

1. **Check AI Copilot Dashboard Panel**
   - Review "AI Copilot Request Rate by Operation"
   - Check "AI Copilot Latency (SLO)" panel
   - Verify "AI Copilot Success Rate (SLO)" gauge

2. **Get Correlation ID from Failed Request**

3. **Search AI-Specific Logs**

   ```logql
   {service="summit-api"}
     | json
     | correlationId="<correlation-id>"
     | message =~ "(?i)(ai|copilot|llm)"
   ```

4. **Check AI Service Metrics**

   ```promql
   # AI request rate by operation
   sum(rate(ai_copilot_requests_total[5m])) by (operation)

   # AI error rate
   sum(rate(ai_copilot_requests_total{status="error"}[5m])) /
   sum(rate(ai_copilot_requests_total[5m]))

   # AI latency percentiles
   histogram_quantile(0.95,
     sum(rate(ai_copilot_latency_seconds_bucket[5m])) by (le)
   )
   ```

5. **Identify Issue Type**
   - **Timeout**: Latency > 8s (p99 SLO violation)
   - **Error**: Check error message for:
     - Rate limiting from LLM provider
     - Invalid prompt structure
     - Token limit exceeded
     - Model availability issues

6. **Check Prompt Integrity**
   ```bash
   # Search for prompt validation failures
   cat /logs/app-structured.log | \
     jq 'select(.correlationId == "<correlation-id>" and
                .message | contains("prompt"))'
   ```

**Resolution Paths**:

- Rate limiting → Check provider quotas, implement backoff
- Timeout → Reduce prompt size, optimize context
- Quality issues → Review prompt templates, model selection
- Model errors → Check LLM provider status page

**AI-Specific Log Fields**:

```json
{
  "correlationId": "...",
  "operation": "query_generation",
  "model": "gpt-4",
  "tokenCount": 2500,
  "duration": 4200,
  "promptHash": "abc123...",
  "error": null
}
```

---

### 4. Governance Policy Violations

**Symptoms**: Unexpected deny verdicts, governance failures

**Diagnosis Steps**:

1. **Check Governance Panel**
   - Review "Governance Verdict Distribution"
   - Look for anomalous patterns (sudden spike in denies)

2. **Get Correlation ID from Denied Request**

3. **Search Governance Logs**

   ```logql
   {service="summit-api"}
     | json
     | correlationId="<correlation-id>"
     | message =~ "(?i)(governance|policy|verdict)"
   ```

4. **Analyze Verdict Details**

   ```bash
   cat /logs/app-structured.log | \
     jq 'select(.correlationId == "<correlation-id>" and
                (.eventType == "governance.verdict" or
                 .message | contains("governance")))' | \
     jq '{time, verdict, policyId, reason, context}'
   ```

5. **Check Policy Evaluation**
   - Look for `policyId` field in logs
   - Review `reason` field for denial explanation
   - Check `context` for evaluated conditions

6. **Verify Policy Configuration**

   ```bash
   # Check OPA policy bundle freshness
   curl http://opa:8181/v1/policies/<policy-id>

   # Check policy metrics
   max(time() - opa_bundle_download_last_success_timestamp_seconds)
   ```

**Resolution Paths**:

- Policy misconfiguration → Review policy rules in OPA
- Stale policy bundle → Trigger policy refresh
- User permission issue → Check RBAC/ABAC assignments
- Data residency violation → Verify tenant/region mapping

**Governance Log Fields**:

```json
{
  "correlationId": "...",
  "eventType": "governance.verdict",
  "verdict": "deny",
  "policyId": "data-residency-eu",
  "reason": "Resource location does not match tenant residency requirement",
  "tenantId": "tenant_123",
  "resourceId": "res_456"
}
```

---

### 5. Authentication / Authorization Failures

**Symptoms**: 401 Unauthorized, 403 Forbidden errors

**Diagnosis Steps**:

1. **Obtain Correlation ID from Auth Error**

2. **Search Authentication Logs**

   ```logql
   {service="summit-api"}
     | json
     | correlationId="<correlation-id>"
     | message =~ "(?i)(auth|token|jwt|permission)"
   ```

3. **Check Audit Logs**

   ```bash
   # Search audit pipeline logs
   cat /logs/audit/*.log | \
     jq 'select(.correlationId == "<correlation-id>")' | \
     jq '{time, event, principalId, resourceId, verdict}'
   ```

4. **Verify Token Validity**
   - Check JWT expiration in logs
   - Look for token validation errors
   - Verify signature validation

5. **Check RBAC/ABAC Evaluation**
   ```bash
   cat /logs/app-structured.log | \
     jq 'select(.correlationId == "<correlation-id>" and
                (.message | contains("rbac") or
                 .message | contains("abac") or
                 .message | contains("opa")))' | \
     jq '{time, message, userId, role, requiredPermissions}'
   ```

**Resolution Paths**:

- Expired token → User needs to re-authenticate
- Missing permissions → Update user role assignments
- Policy failure → Review OPA policy evaluation
- Rate limiting → Check auth rate limiter status

**Authentication Log Fields**:

```json
{
  "correlationId": "...",
  "eventType": "auth.attempt",
  "principalId": "user_123",
  "authMethod": "jwt",
  "success": false,
  "reason": "Token expired",
  "ipAddress": "10.0.1.45"
}
```

---

### 6. Data Residency Violations

**Symptoms**: Requests blocked due to residency enforcement

**Diagnosis Steps**:

1. **Check Residency Logs**

   ```logql
   {service="summit-api"}
     | json
     | correlationId="<correlation-id>"
     | message =~ "(?i)residency"
   ```

2. **Verify Tenant Configuration**

   ```bash
   cat /logs/app-structured.log | \
     jq 'select(.correlationId == "<correlation-id>")' | \
     jq '{tenantId, requestedRegion, allowedRegions, verdict}'
   ```

3. **Check Residency Exception Status**
   ```bash
   # Query residency exceptions
   curl -H "Authorization: Bearer $TOKEN" \
     "http://api/residency/exceptions?tenantId=<tenant-id>"
   ```

**Resolution Paths**:

- Invalid region access → Verify tenant region assignment
- Missing exception → Create residency exception request
- Configuration error → Update tenant residency settings

---

## Log Query Patterns

### By Correlation ID (Complete Flow)

```bash
cat /logs/app-structured.log | \
  jq 'select(.correlationId == "<correlation-id>")' | \
  jq -s 'sort_by(.time)' | \
  jq '.[] | {time, level, message, context}'
```

### By Tenant ID (Tenant-Specific Issues)

```bash
cat /logs/app-structured.log | \
  jq 'select(.tenantId == "<tenant-id>" and .level >= 50)' | \
  jq -s 'sort_by(.time) | reverse | .[:10]'
```

### By Error Type

```bash
# Database errors
cat /logs/app-structured.log | \
  jq 'select(.error.message | contains("database"))'

# Timeout errors
cat /logs/app-structured.log | \
  jq 'select(.error.code == "ETIMEDOUT" or .error.code == "ESOCKETTIMEDOUT")'

# Rate limit errors
cat /logs/app-structured.log | \
  jq 'select(.statusCode == 429)'
```

### Recent Errors (Last N)

```bash
# Last 20 errors
cat /logs/app-structured.log | \
  jq 'select(.level >= 50)' | \
  jq -s 'sort_by(.time) | reverse | .[:20]'
```

### Time Range Search

```bash
# Errors between specific times
cat /logs/app-structured.log | \
  jq 'select(.time >= "2025-12-27T14:00:00Z" and
             .time <= "2025-12-27T15:00:00Z" and
             .level >= 50)'
```

## Grafana Loki Query Patterns

### Basic Correlation ID Search

```logql
{service="summit-api"}
  | json
  | correlationId="<correlation-id>"
```

### Error Logs Only

```logql
{service="summit-api"}
  | json
  | level >= 50
```

### Pattern Matching

```logql
{service="summit-api"}
  | json
  | message =~ "(?i)(error|exception|failed)"
```

### Tenant-Specific

```logql
{service="summit-api"}
  | json
  | tenantId="<tenant-id>"
  | level >= 40
```

### Performance Queries

```logql
{service="summit-api"}
  | json
  | duration > 5000
```

## Prometheus Query Patterns

### Error Rate by Endpoint

```promql
sum(rate(http_requests_total{service="summit-api",status=~"5.."}[5m])) by (path) /
sum(rate(http_requests_total{service="summit-api"}[5m])) by (path)
```

### Latency Percentiles

```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{service="summit-api"}[5m])) by (le, path)
)
```

### Request Volume

```promql
sum(rate(http_requests_total{service="summit-api"}[5m])) by (method, path)
```

### Active Connections

```promql
sum(http_requests_in_flight{service="summit-api"})
```

## Escalation Paths

### Level 1: Self-Service (This Runbook)

- Use correlation ID to trace request
- Check dashboards for patterns
- Review logs for errors
- Attempt known resolutions

### Level 2: Platform Ops Team

**When to Escalate**:

- Issue not resolved after 30 minutes
- Widespread system impact
- Data corruption suspected
- Security incident suspected

**Escalation Info to Provide**:

- Correlation ID(s)
- Time range of incident
- Affected endpoints/operations
- Error messages and stack traces
- Reproduction steps if known

**Contact**:

- Slack: #platform-ops-oncall
- PagerDuty: Platform Ops rotation
- Email: platform-ops@intelgraph.example

### Level 3: Engineering Team

**When to Escalate**:

- Bug requiring code changes
- Performance optimization needed
- Architecture issue identified
- Feature request related to incident

**Contact**:

- Jira: Create ticket with label `incident-<date>`
- Slack: #engineering-support

### Level 4: Security Team

**When to Escalate**:

- Authentication bypass suspected
- Data leak suspected
- Unusual access patterns
- Potential security breach

**Contact**:

- Slack: #security-incidents (immediate)
- Email: security@intelgraph.example
- PagerDuty: Security rotation (urgent)

## Post-Incident Tasks

1. **Document Findings**
   - Create incident report with correlation IDs
   - Document root cause
   - List affected users/tenants
   - Timeline of events

2. **Update Runbook**
   - Add new patterns discovered
   - Document resolution steps
   - Update escalation criteria

3. **Improve Monitoring**
   - Add alerts for new failure modes
   - Create dashboard panels if needed
   - Update SLO definitions

4. **Communication**
   - Notify affected users if needed
   - Post mortem to stakeholders
   - Update status page

## Tools Reference

### Local Log Files

- **Application Logs**: `/logs/app-structured.log`
- **Error Logs**: `/logs/app-error.log`
- **Audit Logs**: `/logs/audit/*.log`

### Dashboards

- **Main Dashboard**: "Summit Operations - Self-Service Diagnostics"
- **AI Dashboard**: "AI Copilot Monitoring"
- **Policy Dashboard**: "Policy Bundles"

### APIs

```bash
# Health check
curl http://localhost:3000/health

# Metrics endpoint
curl http://localhost:3000/metrics

# Rate limit status (admin only)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/rate-limits/<userId>
```

### CLI Tools

```bash
# jq - JSON parsing
jq --version

# grep - Pattern search
grep --version

# Prometheus query
curl -G http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=<promql>'
```

## Best Practices

1. **Always Start with Correlation ID**: It's the fastest path to root cause
2. **Check Dashboards First**: Visual patterns often reveal issues quickly
3. **Use Structured Logs**: `jq` queries are more reliable than grep
4. **Document Everything**: Keep notes during diagnosis for reports
5. **Follow Escalation Paths**: Don't spend too long on complex issues
6. **Update This Runbook**: Add new patterns as you discover them

## Training Resources

- **Structured Logging Guide**: `/audit/ga-evidence/ops/logging/UNIFIED-LOGGING-STANDARD.md`
- **Correlation ID Guide**: `/audit/ga-evidence/ops/correlation/CORRELATION-ID-IMPLEMENTATION.md`
- **Dashboard Guide**: `/audit/ga-evidence/ops/dashboards/README.md`
- **Internal Wiki**: [Observability Training]
- **Video Walkthrough**: [Incident Diagnosis 101]

## Compliance Notes

This runbook supports:

- **SOC 2 CC7.3**: Incident identification procedures
- **SOC 2 CC7.4**: Incident response and investigation
- **SOC 2 A1.2**: Recovery procedures and documentation

All incident diagnosis activities should be logged for audit compliance.

---

**Document History:**

- 2025-12-27: Initial version (v1.0) - GA hardening initiative

**Next Review**: 2026-01-27
