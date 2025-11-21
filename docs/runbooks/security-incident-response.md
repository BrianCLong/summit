# Security Incident Response Runbook

## Overview

This runbook provides procedures for responding to security incidents including unauthorized access, data breaches, and security vulnerabilities.

## Incident Classification

### Severity Levels
- **P0 (Critical)**: Active breach, data exfiltration, complete system compromise
- **P1 (High)**: Unauthorized access, vulnerability being exploited, authentication bypass
- **P2 (Medium)**: Attempted breach, vulnerability discovered, suspicious activity
- **P3 (Low)**: Security misconfiguration, minor vulnerability, policy violation

## Initial Response (First 15 Minutes)

### 1. Confirm the Incident
```bash
# Check security logs
kubectl logs -l app=intelgraph-api -n intelgraph | grep -i "unauthorized\|forbidden\|security"

# Check failed authentication attempts
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    ip_address,
    username,
    COUNT(*) as failed_attempts,
    MAX(created_at) as last_attempt
  FROM auth_logs
  WHERE success = false
  AND created_at > NOW() - INTERVAL '1 hour'
  GROUP BY ip_address, username
  HAVING COUNT(*) > 10
  ORDER BY failed_attempts DESC;
"

# Check for privilege escalation attempts
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    user_id,
    action,
    resource,
    decision,
    created_at
  FROM audit_logs
  WHERE action IN ('role_change', 'permission_grant', 'admin_access')
  AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC;
"
```

### 2. Activate Incident Response Team
- Security Lead
- Engineering Manager
- Legal/Compliance (if data breach suspected)
- Communications (if customer impact)

### 3. Create Incident Channel
```bash
# Create dedicated Slack channel
# #incident-security-<timestamp>
```

### 4. Preserve Evidence
```bash
# Capture current state
kubectl get pods -n intelgraph -o yaml > incident_pods_state.yaml
kubectl get events -n intelgraph > incident_events.log

# Export logs for forensics
kubectl logs -l app=intelgraph-api -n intelgraph --since=24h > incident_api_logs.txt
kubectl logs -l app=intelgraph-worker -n intelgraph --since=24h > incident_worker_logs.txt

# Database audit trail
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  COPY (
    SELECT * FROM audit_logs
    WHERE created_at > NOW() - INTERVAL '48 hours'
  ) TO STDOUT
" > incident_audit_trail.csv

# Store evidence securely
aws s3 cp incident_*.* s3://intelgraph-security-incidents/$(date +%Y%m%d)/
```

## Incident Response Procedures

### Scenario 1: Unauthorized Access Detected

#### Indicators
- Failed login attempts spike
- Successful login from unusual location
- Access to unauthorized resources
- Privilege escalation attempts

#### Immediate Actions

**1. Identify Compromised Account:**
```bash
# Check recent successful logins
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    user_id,
    username,
    ip_address,
    user_agent,
    created_at,
    location
  FROM auth_logs
  WHERE success = true
  AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC;
"

# Check for concurrent sessions from different locations
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    user_id,
    COUNT(DISTINCT ip_address) as ip_count,
    COUNT(DISTINCT location) as location_count,
    array_agg(DISTINCT ip_address) as ips
  FROM active_sessions
  GROUP BY user_id
  HAVING COUNT(DISTINCT ip_address) > 2;
"
```

**2. Immediately Revoke Access:**
```bash
# Terminate all sessions for compromised user
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  DELETE FROM active_sessions
  WHERE user_id = '<compromised-user-id>';
"

# Invalidate all tokens
redis-cli -h redis KEYS "session:<user-id>:*" | xargs redis-cli -h redis DEL

# Force password reset
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  UPDATE users
  SET
    password_reset_required = true,
    account_locked = true,
    locked_reason = 'Security incident',
    locked_at = NOW()
  WHERE id = '<compromised-user-id>';
"
```

**3. Check for Unauthorized Actions:**
```bash
# Review actions taken by compromised account
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    action,
    resource,
    resource_id,
    details,
    created_at
  FROM audit_logs
  WHERE user_id = '<compromised-user-id>'
  AND created_at > '<compromise-time>'
  ORDER BY created_at DESC;
"

# Check for data exports
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    user_id,
    export_type,
    record_count,
    size_bytes,
    status,
    created_at
  FROM exports
  WHERE user_id = '<compromised-user-id>'
  AND created_at > '<compromise-time>';
"
```

**4. Assess Impact:**
```bash
# Check accessed sensitive data
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT DISTINCT
    e.entity_id,
    e.entity_type,
    e.classification_level,
    al.action,
    al.created_at
  FROM audit_logs al
  JOIN entities e ON e.id = al.resource_id::uuid
  WHERE al.user_id = '<compromised-user-id>'
  AND al.created_at > '<compromise-time>'
  AND e.classification_level IN ('SECRET', 'TOP_SECRET', 'PII')
  ORDER BY al.created_at;
"
```

### Scenario 2: Data Breach / Exfiltration

#### Indicators
- Large data exports
- Unusual API access patterns
- Database queries for sensitive data
- S3 bucket access spikes

#### Immediate Actions

**1. Stop the Bleeding:**
```bash
# Identify data exfiltration
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    user_id,
    endpoint,
    COUNT(*) as request_count,
    SUM(response_size_bytes) as total_bytes,
    MAX(created_at) as last_request
  FROM api_requests
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY user_id, endpoint
  HAVING SUM(response_size_bytes) > 100000000  -- >100MB
  ORDER BY total_bytes DESC;
"

# Block suspicious IPs immediately
kubectl patch configmap intelgraph-config -n intelgraph --type merge -p '
{
  "data": {
    "BLOCKED_IPS": "203.0.113.45,203.0.113.46,203.0.113.47"
  }
}
'

kubectl rollout restart deployment intelgraph-api -n intelgraph
```

**2. Assess Scope of Breach:**
```bash
# Identify compromised data
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    tenant_id,
    COUNT(DISTINCT entity_id) as entities_accessed,
    COUNT(DISTINCT investigation_id) as investigations_accessed,
    COUNT(*) as total_accesses,
    MIN(created_at) as first_access,
    MAX(created_at) as last_access
  FROM audit_logs
  WHERE user_id IN ('<compromised-user-ids>')
  AND created_at > '<compromise-start-time>'
  GROUP BY tenant_id;
"

# Check for PII exposure
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    e.id,
    e.entity_type,
    e.classification_level,
    COUNT(DISTINCT al.user_id) as accessor_count,
    array_agg(DISTINCT al.user_id) as accessors
  FROM entities e
  JOIN audit_logs al ON al.resource_id::uuid = e.id
  WHERE e.classification_level = 'PII'
  AND al.created_at > '<compromise-start-time>'
  GROUP BY e.id, e.entity_type, e.classification_level;
"
```

**3. Notify Stakeholders:**
```bash
# Determine breach notification requirements
# - GDPR: 72 hours
# - CCPA: Without unreasonable delay
# - HIPAA: 60 days

# Generate breach report
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  COPY (
    SELECT
      t.name as tenant_name,
      u.email as user_email,
      e.entity_type,
      e.classification_level,
      al.action,
      al.created_at
    FROM audit_logs al
    JOIN users u ON u.id = al.user_id
    JOIN tenants t ON t.id = al.tenant_id
    LEFT JOIN entities e ON e.id = al.resource_id::uuid
    WHERE al.user_id IN ('<compromised-user-ids>')
    AND al.created_at > '<compromise-start-time>'
    ORDER BY al.created_at
  ) TO STDOUT WITH CSV HEADER
" > breach_report.csv
```

### Scenario 3: Vulnerability Exploitation

#### Indicators
- Security scanner alerts
- Unusual error patterns
- Injection attempts in logs
- Exploitation signatures detected

#### Immediate Actions

**1. Confirm Vulnerability:**
```bash
# Check for exploitation attempts
kubectl logs -l app=intelgraph-api -n intelgraph | \
  grep -E "(sql injection|xss|rce|lfi|rfi|xxe)" -i

# Check WAF logs
aws wafv2 get-sampled-requests \
  --web-acl-arn <acl-arn> \
  --rule-metric-name <rule-name> \
  --scope REGIONAL \
  --time-window <window> \
  --max-items 500

# Analyze attack patterns
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    ip_address,
    endpoint,
    method,
    payload_sample,
    COUNT(*) as attempt_count
  FROM api_requests
  WHERE status_code >= 400
  AND created_at > NOW() - INTERVAL '24 hours'
  GROUP BY ip_address, endpoint, method, payload_sample
  HAVING COUNT(*) > 10
  ORDER BY attempt_count DESC;
"
```

**2. Deploy Emergency Patch:**
```bash
# If patch available, deploy immediately
git checkout security-patch-branch
docker build -t intelgraph/api:security-patch .
docker push intelgraph/api:security-patch

kubectl set image deployment/intelgraph-api -n intelgraph \
  api=intelgraph/api:security-patch

kubectl rollout status deployment/intelgraph-api -n intelgraph

# Verify patch
curl -X POST https://api.intelgraph.com/test-endpoint \
  -H "Content-Type: application/json" \
  -d '<exploit-payload>'
# Should return 400 Bad Request, not 500
```

**3. Enable WAF Rules:**
```bash
# Enable stricter WAF rules
aws wafv2 update-web-acl \
  --name intelgraph-waf \
  --scope REGIONAL \
  --id <web-acl-id> \
  --default-action Block='{}' \
  --rules file://strict-waf-rules.json

# Or use Cloudflare
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/<zone-id>/firewall/waf/packages/<package-id>/groups/<group-id>" \
  -H "X-Auth-Email: <email>" \
  -H "X-Auth-Key: <api-key>" \
  -H "Content-Type: application/json" \
  --data '{"mode":"on"}'
```

### Scenario 4: Insider Threat

#### Indicators
- Access to unauthorized tenants/data
- Bulk data downloads
- Suspicious database queries
- Privilege escalation attempts

#### Immediate Actions

**1. Document Evidence:**
```bash
# Full audit trail for suspect user
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  COPY (
    SELECT * FROM audit_logs
    WHERE user_id = '<suspect-user-id>'
    AND created_at > NOW() - INTERVAL '90 days'
    ORDER BY created_at
  ) TO STDOUT
" > insider_threat_audit_trail.csv

# Database access patterns
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  SELECT
    query,
    COUNT(*) as execution_count,
    MIN(created_at) as first_execution,
    MAX(created_at) as last_execution
  FROM query_logs
  WHERE user_id = '<suspect-user-id>'
  GROUP BY query
  ORDER BY execution_count DESC;
"
```

**2. Restrict Access Without Alerting:**
```bash
# Reduce permissions quietly
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  UPDATE users
  SET role = 'read_only'
  WHERE id = '<suspect-user-id>';
"

# Enable enhanced logging for this user
psql -h postgres -U $POSTGRES_USER -d intelgraph -c "
  UPDATE users
  SET enhanced_logging = true
  WHERE id = '<suspect-user-id>';
"
```

**3. Coordinate with HR/Legal:**
- Document all findings
- Do not confront directly
- Coordinate timing of access revocation with HR
- Prepare for potential litigation

## Post-Incident Procedures

### Immediate (Within 24 Hours)

1. **Complete Investigation:**
   - Document timeline
   - Identify root cause
   - Assess full impact
   - Preserve all evidence

2. **Containment Verification:**
   - Confirm threat neutralized
   - Verify no backdoors remain
   - Check for persistence mechanisms

3. **Notification:**
   - Affected customers
   - Regulatory bodies (if required)
   - Law enforcement (if criminal)
   - Insurance provider

### Short-term (Within 1 Week)

1. **Remediation:**
   - Apply security patches
   - Rotate all credentials
   - Update security controls
   - Implement additional monitoring

2. **Security Review:**
   - Code review of affected systems
   - Penetration testing
   - Security configuration audit

3. **Post-Mortem:**
   - Conduct incident review
   - Document lessons learned
   - Update procedures
   - Train team on findings

### Long-term (Within 1 Month)

1. **Security Improvements:**
   - Implement recommended controls
   - Update security policies
   - Enhance monitoring
   - Regular security training

2. **Compliance:**
   - Document for audits
   - Update risk register
   - Review insurance coverage
   - Update incident response plan

## Communication Templates

### Internal - Initial Alert
```
🚨 SECURITY INCIDENT - P0

Type: <Unauthorized Access/Data Breach/Vulnerability>
Status: Active Investigation
Time Detected: <timestamp>
Incident Commander: <name>

Initial Assessment:
- Scope: <description>
- Impact: <description>
- Containment: In Progress

War Room: #incident-security-<timestamp>
Next Update: <timestamp>
```

### Customer Notification - Data Breach
```
Subject: Important Security Notice

Dear <Customer>,

We are writing to inform you of a security incident that may have affected your account.

What Happened:
<Brief description of incident>

What Information Was Involved:
<List of affected data types>

What We're Doing:
- Immediately secured all systems
- Conducting thorough investigation
- Implementing additional security measures
- Working with law enforcement

What You Should Do:
1. Reset your password immediately
2. Review your account activity
3. Enable two-factor authentication
4. Monitor for suspicious activity

We take security seriously and sincerely apologize for this incident.

For questions: security@intelgraph.com
Incident Reference: <incident-id>
```

## Prevention Checklist

- [ ] Regular security training for all staff
- [ ] Penetration testing quarterly
- [ ] Security code reviews
- [ ] Dependency vulnerability scanning
- [ ] WAF with updated rules
- [ ] Rate limiting on all endpoints
- [ ] Strong authentication (MFA required)
- [ ] Principle of least privilege
- [ ] Regular access reviews
- [ ] Encryption at rest and in transit
- [ ] Comprehensive audit logging
- [ ] Incident response drills
- [ ] Security monitoring and alerting
- [ ] Backup and disaster recovery tested
- [ ] Vendor security assessments

## Emergency Contacts

- **Security Lead**: [contact]
- **Engineering Manager**: [contact]
- **Legal Counsel**: [contact]
- **PR/Communications**: [contact]
- **Law Enforcement**: local cyber crimes unit
- **Forensics Partner**: [contact]
- **Cyber Insurance**: [policy number, contact]

## References

- NIST Incident Response Guide: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf
- GDPR Breach Notification: https://gdpr.eu/data-breach-notification/
- CCPA Requirements: https://oag.ca.gov/privacy/ccpa
- Internal Security Policy: https://docs.intelgraph.com/security/policy
- Forensics Procedures: https://docs.intelgraph.com/security/forensics
