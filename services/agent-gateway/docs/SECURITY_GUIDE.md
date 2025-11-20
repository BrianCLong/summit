# Security Guide

Comprehensive security guidelines for the Summit Agent Gateway.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Credential Management](#credential-management)
4. [Network Security](#network-security)
5. [Data Protection](#data-protection)
6. [Audit & Compliance](#audit--compliance)
7. [Incident Response](#incident-response)
8. [Security Checklist](#security-checklist)

## Security Architecture

### Defense in Depth

The Agent Gateway implements multiple layers of security:

```
┌─────────────────────────────────────────────┐
│ Layer 1: Network (Firewall, TLS)           │
├─────────────────────────────────────────────┤
│ Layer 2: Authentication (API Keys, JWT)    │
├─────────────────────────────────────────────┤
│ Layer 3: Authorization (OPA Policies)      │
├─────────────────────────────────────────────┤
│ Layer 4: Scoping (Tenant Isolation)        │
├─────────────────────────────────────────────┤
│ Layer 5: Operation Modes (SIMULATION)      │
├─────────────────────────────────────────────┤
│ Layer 6: Approval Workflow (Human-in-loop) │
├─────────────────────────────────────────────┤
│ Layer 7: Audit Logging (Complete trail)    │
└─────────────────────────────────────────────┘
```

### Threat Model

**Threats Addressed:**

1. **Unauthorized Access**
   - Mitigation: API key authentication, token expiration, revocation

2. **Privilege Escalation**
   - Mitigation: Capability-based access control, least privilege

3. **Cross-Tenant Data Access**
   - Mitigation: Strict tenant scoping, database RLS, policy enforcement

4. **Malicious Actions**
   - Mitigation: Operation modes, approval workflow, rate limiting

5. **Data Exfiltration**
   - Mitigation: Export auditing, quota limits, anomaly detection

6. **Credential Compromise**
   - Mitigation: Hashing, rotation, expiration, revocation

## Authentication & Authorization

### API Key Security

**Generation:**
```typescript
// Generate cryptographically secure API keys
const key = `agt_${randomBytes(32).toString('hex')}`;
// Result: 64 character hex string (256 bits entropy)
```

**Storage:**
```typescript
// Never store plaintext
const keyHash = await bcrypt.hash(key, 12); // 12 rounds

// Store only hash and prefix
{
  keyHash: '$2b$12$...',  // Bcrypt hash
  keyPrefix: 'agt_abc123', // For identification
}
```

**Verification:**
```typescript
// Constant-time comparison
const isValid = await bcrypt.compare(providedKey, storedHash);
```

### Token Expiration

**Default Lifetimes:**
- Development: 365 days
- Staging: 90 days
- Production: 30 days

**Rotation Policy:**
```bash
# Rotate before expiration
DAYS_BEFORE_EXPIRY=7

# Automated rotation
summit-agent credential:rotate $CREDENTIAL_ID
```

### Authorization Flow

```
1. Agent provides API key
2. Gateway validates key (hash comparison)
3. Gateway loads agent entity & capabilities
4. OPA evaluates policy with agent context
5. Action allowed/denied based on policy
6. High-risk actions require approval
7. All decisions logged to audit trail
```

## Credential Management

### Best Practices

#### 1. Secure Storage

```bash
# Never commit credentials
echo "agt_*" >> .gitignore

# Use environment variables
export AGENT_API_KEY="agt_..."

# Or secure secret stores
aws secretsmanager create-secret \
  --name agent-api-key \
  --secret-string "agt_..."
```

#### 2. Principle of Least Privilege

```typescript
// ❌ DON'T: Grant all capabilities
capabilities: ['*']

// ✅ DO: Grant only what's needed
capabilities: ['read:data', 'query:database']
```

#### 3. Regular Rotation

```bash
# Set rotation schedule
0 0 1 * * /usr/local/bin/rotate-agent-credentials.sh
```

#### 4. Revocation

```bash
# Immediate revocation on compromise
summit-agent credential:revoke $CREDENTIAL_ID --reason "Compromised"

# Check revocation status
summit-agent credential:list $AGENT_ID
```

### Credential Lifecycle

```
1. Creation → Generated with crypto.randomBytes
2. Active → Used for authentication
3. Rotation → Old revoked, new created
4. Expiration → Auto-revoked after expiry date
5. Compromise → Manually revoked immediately
```

## Network Security

### TLS/HTTPS

**Production Requirements:**
```bash
# Always use HTTPS in production
GATEWAY_URL=https://agents.summit.example.com

# Minimum TLS 1.2
# Preferred: TLS 1.3

# Strong cipher suites only
```

### Firewall Rules

```bash
# Allow only necessary ports
iptables -A INPUT -p tcp --dport 3001 -j ACCEPT  # Agent Gateway
iptables -A INPUT -p tcp --dport 8181 -j ACCEPT  # OPA (internal only)
iptables -A INPUT -p tcp --dport 5432 -j DROP    # PostgreSQL (internal only)
```

### Rate Limiting

**Per-Agent Limits:**
```typescript
{
  hourly_api_calls: 1000,
  daily_api_calls: 10000,
  daily_runs: 100,
  concurrent_runs: 5,
}
```

**Global Limits:**
```typescript
{
  globalRateLimitPerHour: 10000,
  globalRateLimitPerDay: 100000,
}
```

### DDoS Protection

```bash
# Use reverse proxy (nginx/CloudFlare)
# Implement connection limits
# Enable request throttling
# Set up monitoring alerts
```

## Data Protection

### Encryption at Rest

**Database:**
```sql
-- Enable transparent data encryption
ALTER DATABASE summit SET encryption = on;

-- Encrypt sensitive columns
CREATE EXTENSION pgcrypto;

UPDATE agent_credentials
SET key_hash = pgp_sym_encrypt(key_hash, 'encryption_key');
```

**Backups:**
```bash
# Encrypt backups
pg_dump summit | gpg --encrypt --recipient admin@company.com > backup.sql.gpg

# Verify encryption
gpg --list-packets backup.sql.gpg
```

### Encryption in Transit

**TLS Configuration:**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers off;

# HSTS
add_header Strict-Transport-Security "max-age=63072000" always;
```

### Sensitive Data Handling

**Logging:**
```typescript
// ❌ DON'T log sensitive data
logger.info(`Agent authenticated with key: ${apiKey}`);

// ✅ DO log only prefixes/hashes
logger.info(`Agent authenticated`, { keyPrefix: 'agt_abc123' });
```

**API Responses:**
```typescript
// Never return full API keys
{
  credential: {
    keyPrefix: 'agt_abc123', // OK
    expiresAt: '2025-12-31',  // OK
    // keyHash: '...'         // NEVER include
  }
}
```

## Audit & Compliance

### Comprehensive Logging

**What to Log:**
```typescript
{
  timestamp: Date;
  agentId: string;
  agentName: string;
  action: string;
  target: string;
  outcome: 'allowed' | 'denied';
  riskLevel: RiskLevel;
  tenantId: string;
  traceId: string;
  ipAddress: string;
  userAgent: string;
}
```

**Retention:**
```sql
-- Keep audit logs for compliance period
-- Default: 7 years for financial data
-- Minimum: 1 year for security logs

CREATE TABLE agent_audit_log_archive (
  LIKE agent_audit_log INCLUDING ALL
);

-- Move old logs to archive
INSERT INTO agent_audit_log_archive
SELECT * FROM agent_audit_log
WHERE timestamp < NOW() - INTERVAL '1 year';
```

### Compliance Standards

**GDPR:**
- Right to be forgotten: Implement data deletion
- Data portability: Provide export capabilities
- Consent tracking: Log approval decisions
- Breach notification: 72-hour alert system

**SOC 2:**
- Access controls: Capability-based authorization
- Audit trails: Complete logging
- Change management: Approval workflow
- Monitoring: Continuous health checks

**HIPAA (if applicable):**
- Encryption: At rest and in transit
- Access logs: Complete audit trail
- Authentication: Strong API keys
- Breach notification: Automated alerting

## Incident Response

### Security Incident Playbook

#### 1. Credential Compromise

```bash
# Immediate actions:
1. Revoke compromised credential
summit-agent credential:revoke $CRED_ID --reason "Compromised"

2. Suspend agent
summit-agent update $AGENT_ID --status suspended

3. Review recent activity
summit-agent audit:search --agent $AGENT_ID --hours 24

4. Rotate all credentials for affected agent
summit-agent credential:rotate-all $AGENT_ID

5. Alert security team
alert-team "Agent credential compromised: $AGENT_ID"
```

#### 2. Unauthorized Access Attempt

```bash
# Detection:
- Multiple failed authentication attempts
- Access to unauthorized tenants
- Unusual action patterns

# Response:
1. Review audit logs
2. Identify attack vector
3. Block IP if external
4. Review and tighten policies
5. Notify stakeholders
```

#### 3. Data Exfiltration

```bash
# Detection:
- Large export requests
- Unusual data access patterns
- Quota exceeded alerts

# Response:
1. Suspend agent immediately
2. Review all actions in last 24h
3. Assess data exposure
4. Revoke all credentials
5. Investigate root cause
6. Notify affected parties
```

### Monitoring Alerts

**Critical Alerts:**
```yaml
- name: Multiple Auth Failures
  threshold: 10 failures in 5 minutes
  action: Suspend agent, notify security

- name: Cross-Tenant Access Attempt
  threshold: 1 violation
  action: Block immediately, escalate

- name: High-Risk Action Without Approval
  threshold: 1 occurrence
  action: Investigate, audit

- name: Quota Exhaustion
  threshold: 95% utilization
  action: Alert owner, rate limit
```

## Security Checklist

### Deployment

- [ ] TLS/HTTPS enabled
- [ ] Firewall rules configured
- [ ] Database encryption enabled
- [ ] Backups encrypted
- [ ] OPA policies deployed
- [ ] Audit logging enabled
- [ ] Monitoring configured
- [ ] Alerts set up

### Agent Onboarding

- [ ] Business justification documented
- [ ] Least privilege capabilities
- [ ] Tenant scopes minimal
- [ ] Owner/contact assigned
- [ ] Credentials stored securely
- [ ] Expiration set appropriately
- [ ] Certification completed (if required)

### Operations

- [ ] Regular credential rotation
- [ ] Audit log review (weekly)
- [ ] Access pattern analysis
- [ ] Policy updates
- [ ] Security patches applied
- [ ] Backup verification
- [ ] Disaster recovery tested

### Agent Retirement

- [ ] Revoke all credentials
- [ ] Update agent status to 'retired'
- [ ] Export final audit logs
- [ ] Document reason for retirement
- [ ] Remove from monitoring
- [ ] Archive configuration

## Additional Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework
- **CIS Controls**: https://www.cisecurity.org/controls/
- **Cloud Security Alliance**: https://cloudsecurityalliance.org/

## Contact

- Security Issues: security@company.com
- Incident Response: incident-response@company.com
- Security Team: security-team@company.com

---

**Last Updated:** 2025-11-20
**Version:** 1.0
**Classification:** Internal Use Only
