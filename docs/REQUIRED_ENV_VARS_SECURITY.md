# Required Environment Variables for Secure Deployment

## Overview

This document lists all **required** environment variables that must be set in production environments. These variables control critical security functions including encryption, signing, authentication, and tenant isolation.

**IMPORTANT:** The application will intentionally fail to start in production if these variables are not properly configured. This is a security feature, not a bug.

---

## Critical Security Variables

### 1. SWARM_SECRET

**Purpose:** Shared secret for swarm consensus message signing (BFT protocol)

**Location:** `server/src/agents/swarm/ConsensusEngine.ts`

**Format:** 32+ character random string

**Generation:**
```bash
openssl rand -hex 32
```

**Production Requirement:** MANDATORY - Application throws error if not set

**Example:**
```bash
export SWARM_SECRET="a1b2c3d4e5f6...64-char-hex-string"
```

---

### 2. AUDIT_SIGNING_KEY

**Purpose:** HMAC signing key for audit trail integrity (tamper detection)

**Location:** `server/src/audit/advanced-audit-system.ts`

**Format:** 32+ character random string

**Generation:**
```bash
openssl rand -hex 32
```

**Production Requirement:** MANDATORY - Application throws error if not set

**Compliance Impact:** Required for SOX, GDPR, HIPAA audit trail compliance

**Key Rotation:** Recommended every 90 days. Use versioned keys for historical verification.

**Example:**
```bash
export AUDIT_SIGNING_KEY="x1y2z3...64-char-hex-string"
```

---

### 3. AUDIT_ENCRYPTION_KEY

**Purpose:** Encryption key for sensitive audit data at rest

**Location:** `server/src/audit/advanced-audit-system.ts`

**Format:** 32+ character random string

**Generation:**
```bash
openssl rand -hex 32
```

**Production Requirement:** MANDATORY - Application throws error if not set

**Compliance Impact:** Required for encrypting PII in audit logs (GDPR, CCPA)

**Key Management:**
- Store in Vault/KMS
- Enable automatic rotation
- Maintain key history for data recovery

**Example:**
```bash
export AUDIT_ENCRYPTION_KEY="p1q2r3...64-char-hex-string"
```

---

### 4. BILLING_HMAC_SECRET

**Purpose:** HMAC signature for billing data integrity

**Location:** `server/src/billing/sink.ts`

**Format:** 32+ character random string

**Generation:**
```bash
openssl rand -hex 32
```

**Production Requirement:** MANDATORY when `BILLING_ENABLED=true`

**Usage:** Signs billing exports to prevent tampering and verify authenticity

**Example:**
```bash
export BILLING_ENABLED="true"
export BILLING_HMAC_SECRET="m1n2o3...64-char-hex-string"
```

---

### 5. MMKV_ENCRYPTION_KEY (Mobile Apps)

**Purpose:** Encryption key for mobile app local storage (MMKV)

**Location:** `apps/mobile-native/src/services/Database.ts`

**Format:** 16+ character random string

**Provisioning:** Via `react-native-config` or device secure storage (Keychain/Keystore)

**Production Requirement:** MANDATORY - Mobile app throws error if not set

**Platform-Specific:**
- **iOS:** Consider using iOS Keychain for runtime key retrieval
- **Android:** Consider using Android Keystore for runtime key retrieval

**Example (react-native-config):**
```bash
# .env.production
MMKV_ENCRYPTION_KEY=k1l2m3n4o5p6q7r8
ENV=production
```

---

## Deployment Checklist

### Pre-Production

- [ ] Generate all required secrets using cryptographically secure methods
- [ ] Store secrets in Vault, AWS Secrets Manager, or equivalent KMS
- [ ] Configure secret rotation policies (recommended: 90 days)
- [ ] Document secret recovery procedures
- [ ] Test deployment with production-like secret configuration

### Production Deployment

- [ ] Verify all required environment variables are set
- [ ] Confirm secrets are NOT hardcoded in config files
- [ ] Enable secret rotation automation
- [ ] Configure monitoring for secret expiration warnings
- [ ] Document incident response for compromised secrets

### Post-Deployment

- [ ] Verify application starts without errors
- [ ] Check logs for security warnings
- [ ] Audit secret access patterns
- [ ] Schedule first secret rotation

---

## Secret Management Best Practices

### DO

✅ Use Vault, AWS Secrets Manager, or Azure Key Vault
✅ Enable automatic rotation
✅ Use different keys per environment (dev, staging, prod)
✅ Audit secret access
✅ Encrypt secrets at rest and in transit
✅ Use RBAC for secret access
✅ Document rotation procedures

### DON'T

❌ Hardcode secrets in source code
❌ Commit secrets to version control
❌ Share secrets via email/Slack
❌ Reuse secrets across environments
❌ Use weak or predictable secrets
❌ Skip rotation policies
❌ Log secrets in application logs

---

## Development vs Production

### Development Mode

**Behavior:**
- Application warns about missing secrets
- Falls back to clearly labeled insecure defaults
- Continues to run (fail-open)

**Purpose:**
- Enable local development without complex setup
- Clear warnings prevent accidental production deployment

**Example Warning:**
```
WARN: AUDIT_SIGNING_KEY not set - using insecure defaults for development only.
NEVER use these defaults in production!
```

### Production Mode

**Behavior:**
- Application checks `NODE_ENV=production` or `ENV=production`
- Throws error if any required secret is missing
- Application fails to start (fail-closed)

**Purpose:**
- Prevent deployment with insecure defaults
- Force explicit secret configuration
- Reduce attack surface

**Example Error:**
```
Error: AUDIT_SIGNING_KEY and AUDIT_ENCRYPTION_KEY environment variables must be set in production.
These keys are critical for audit trail integrity and compliance.
```

---

## Incident Response

### If a Secret is Compromised

1. **Immediate:**
   - Rotate the compromised secret
   - Redeploy with new secret
   - Revoke access using old secret

2. **Within 24 hours:**
   - Audit access logs for unauthorized use
   - Identify scope of potential impact
   - Notify security team and stakeholders

3. **Within 1 week:**
   - Complete incident report
   - Review and update secret management procedures
   - Schedule post-incident review

### Emergency Key Rotation

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Update in Vault/KMS
vault kv put secret/prod/audit signing_key=$NEW_SECRET

# 3. Trigger rolling deployment
kubectl rollout restart deployment/intelgraph -n production

# 4. Verify new secret is active
kubectl logs deployment/intelgraph -n production | grep "Audit system initialized"

# 5. Mark old secret as revoked in KMS
```

---

## Compliance Mapping

| Variable | SOX | GDPR | HIPAA | PCI-DSS |
|----------|-----|------|-------|---------|
| AUDIT_SIGNING_KEY | ✅ | ✅ | ✅ | ✅ |
| AUDIT_ENCRYPTION_KEY | ✅ | ✅ | ✅ | ✅ |
| BILLING_HMAC_SECRET | ✅ | ✅ | ⚠️ | ✅ |
| SWARM_SECRET | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| MMKV_ENCRYPTION_KEY | ❌ | ✅ | ✅ | ⚠️ |

**Legend:**
- ✅ Required for compliance
- ⚠️ Recommended for compliance
- ❌ Not applicable

---

## Monitoring and Alerts

### Recommended Alerts

1. **Secret Near Expiration**
   - Trigger: 14 days before rotation due
   - Action: Schedule rotation

2. **Failed Secret Access**
   - Trigger: Application cannot retrieve secret from KMS
   - Action: Check KMS connectivity and permissions

3. **Development Secret in Production**
   - Trigger: Application logs insecure default warning
   - Action: Immediate remediation required

4. **Secret Rotation Failure**
   - Trigger: Automatic rotation fails
   - Action: Manual rotation required

### Monitoring Queries (Prometheus)

```promql
# Secret retrieval failures
increase(secret_retrieval_errors_total[5m]) > 0

# Applications running with default secrets (should be 0 in prod)
sum(insecure_default_secrets_active{env="production"}) > 0
```

---

## Additional Resources

- [SECURITY.md](../SECURITY.md) - Comprehensive security policy
- [SECURITY_MITIGATIONS.md](../SECURITY_MITIGATIONS.md) - Known vulnerabilities and mitigations
- [OPERATOR_GUIDE.md](../OPERATOR_GUIDE.md) - Deployment procedures
- [RUNBOOKS/break-glass-access.md](../RUNBOOKS/break-glass-access.md) - Emergency access procedures

---

**Last Updated:** 2025-12-30
**Owner:** Security Team
**Review Cycle:** Quarterly
