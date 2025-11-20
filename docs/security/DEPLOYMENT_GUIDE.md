# Security Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the OWASP-compliant security features in production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migration](#database-migration)
3. [Environment Configuration](#environment-configuration)
4. [Security Secrets Generation](#security-secrets-generation)
5. [Application Deployment](#application-deployment)
6. [Post-Deployment Validation](#post-deployment-validation)
7. [Rollback Procedure](#rollback-procedure)
8. [Monitoring & Alerts](#monitoring--alerts)

---

## Pre-Deployment Checklist

Before deploying security features to production, ensure:

- [ ] All code changes reviewed and approved
- [ ] Security audit passed (`npm run security:audit`)
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] No critical vulnerabilities (`npm audit`)
- [ ] Database backup completed
- [ ] Rollback plan documented
- [ ] Security team notified
- [ ] Maintenance window scheduled (if required)

---

## Database Migration

### Step 1: Review Migration

Review the token security migration:

```bash
cat server/migrations/007_add_token_security.sql
```

The migration creates:
- `token_blacklist` table for revoked JWT tokens
- `is_revoked` column in `user_sessions` table
- Indexes for performance
- Cleanup functions for expired tokens

### Step 2: Backup Database

**Critical**: Always backup before running migrations!

```bash
# PostgreSQL backup
pg_dump -U $POSTGRES_USER -d $POSTGRES_DB > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

### Step 3: Test Migration (Staging)

Run migration in staging environment first:

```bash
# Connect to staging database
psql -U $POSTGRES_USER -d $POSTGRES_DB_STAGING

# Run migration
\i server/migrations/007_add_token_security.sql

# Verify tables created
\dt token_blacklist
\d user_sessions

# Check indexes
\di token_blacklist*

# Test cleanup function
SELECT cleanup_expired_blacklist();

# Exit
\q
```

### Step 4: Run Migration (Production)

After successful staging test:

```bash
# Connect to production database
psql -U $POSTGRES_USER -d $POSTGRES_DB_PROD

# Run migration
\i server/migrations/007_add_token_security.sql

# Verify
SELECT COUNT(*) FROM token_blacklist;
SELECT COUNT(*) FROM user_sessions WHERE is_revoked = TRUE;

# Exit
\q
```

### Step 5: Schedule Cleanup Jobs

Add cron jobs for token cleanup:

```bash
# Edit crontab
crontab -e

# Add these jobs (adjust database connection as needed)
# Clean expired blacklisted tokens daily at 2 AM
0 2 * * * psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT cleanup_expired_blacklist();"

# Clean old revoked sessions weekly on Sunday at 3 AM
0 3 * * 0 psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT cleanup_revoked_sessions();"
```

---

## Environment Configuration

### Step 1: Generate Secrets

Generate strong, cryptographically secure secrets:

```bash
# Generate JWT secrets (256-bit)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate session and encryption keys
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Configure Environment Variables

Update production environment variables:

```bash
# JWT Configuration
export JWT_SECRET="<generated-secret-from-step-1>"
export JWT_REFRESH_SECRET="<generated-refresh-secret-from-step-1>"
export JWT_EXPIRES_IN="15m"              # OWASP: Short-lived access tokens
export JWT_REFRESH_EXPIRES_IN="7d"       # 7 days for refresh tokens
export JWT_ISSUER="intelgraph"
export JWT_AUDIENCE="intelgraph-api"
export JWT_ALGORITHM="RS256"

# Session & Encryption
export SESSION_SECRET="<generated-session-secret>"
export ENCRYPTION_KEY="<generated-encryption-key>"

# OWASP Security Features
export OWASP_SECURITY_ENABLED="true"
export ENABLE_TOKEN_BLACKLIST="true"
export ENABLE_TOKEN_ROTATION="true"
export ENABLE_SESSION_REVOCATION="true"

# Security Headers
export CSP_ENABLED="true"
export CSP_REPORT_URI="https://your-domain.com/api/csp-report"
export HSTS_ENABLED="true"
export HSTS_MAX_AGE="31536000"
export PERMISSIONS_POLICY_ENABLED="true"

# CORS
export ALLOWED_ORIGINS="https://app.your-domain.com,https://admin.your-domain.com"

# Rate Limiting
export RATE_LIMIT_AUTH_MAX="5"           # 5 requests/min for auth
export RATE_LIMIT_GRAPHQL_MAX="100"      # 100 requests/min for GraphQL
export RATE_LIMIT_API_MAX="1000"         # 1000 requests/hour for REST

# Node Environment
export NODE_ENV="production"
```

### Step 3: Update Secrets Manager

If using AWS Secrets Manager, HashiCorp Vault, or similar:

```bash
# AWS Secrets Manager example
aws secretsmanager create-secret \
  --name prod/intelgraph/jwt-secret \
  --secret-string "$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')"

aws secretsmanager create-secret \
  --name prod/intelgraph/jwt-refresh-secret \
  --secret-string "$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')"

# Retrieve in application startup
aws secretsmanager get-secret-value --secret-id prod/intelgraph/jwt-secret
```

---

## Security Secrets Generation

### Production Secret Requirements

All production secrets MUST:
- Be at least 256 bits (32 bytes) in length
- Use cryptographically secure random generation
- Be unique per environment (dev, staging, prod)
- Be rotated every 90 days
- Never be committed to version control
- Be stored in a secure secrets manager

### Secret Generation Script

Create a script to generate all secrets at once:

```bash
#!/bin/bash
# generate-secrets.sh

echo "=== IntelGraph Security Secrets ==="
echo ""
echo "# JWT Configuration"
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo ""
echo "# Session & Encryption"
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo ""
echo "⚠️  IMPORTANT: Store these secrets securely!"
echo "⚠️  Never commit these to version control!"
echo "⚠️  Rotate secrets every 90 days!"
```

Run the script:

```bash
chmod +x scripts/generate-secrets.sh
./scripts/generate-secrets.sh > secrets.txt

# Review and copy to secrets manager
cat secrets.txt

# Securely delete after copying
shred -u secrets.txt
```

---

## Application Deployment

### Step 1: Build Application

```bash
# Install dependencies
npm ci --production

# Run TypeScript compilation
npm run build

# Verify build
ls -la dist/
```

### Step 2: Run Security Audit

Before deploying, verify security compliance:

```bash
# Run comprehensive security audit
npm run security:audit

# Check for vulnerabilities
npm audit --production --audit-level=high

# Verify environment
node -e "console.log('Node:', process.version)"
node -e "console.log('Env:', process.env.NODE_ENV)"
```

### Step 3: Deploy Application

#### Option A: Docker Deployment

```bash
# Build Docker image
docker build -t intelgraph-api:latest .

# Run with environment variables
docker run -d \
  --name intelgraph-api \
  --env-file .env.production \
  -p 4000:4000 \
  intelgraph-api:latest

# Check logs
docker logs -f intelgraph-api
```

#### Option B: PM2 Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start dist/index.js \
  --name intelgraph-api \
  --instances max \
  --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

#### Option C: Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: intelgraph-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: intelgraph-api
  template:
    metadata:
      labels:
        app: intelgraph-api
    spec:
      containers:
      - name: api
        image: intelgraph-api:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: intelgraph-secrets
              key: jwt-secret
        ports:
        - containerPort: 4000
```

Deploy to Kubernetes:

```bash
# Create secrets
kubectl create secret generic intelgraph-secrets \
  --from-literal=jwt-secret=$JWT_SECRET \
  --from-literal=jwt-refresh-secret=$JWT_REFRESH_SECRET

# Deploy application
kubectl apply -f k8s-deployment.yaml

# Check status
kubectl get pods
kubectl logs -f deployment/intelgraph-api
```

### Step 4: Verify Deployment

```bash
# Check application health
curl https://your-domain.com/health

# Check security headers
curl -I https://your-domain.com/ | grep -E "(Strict-Transport|X-Frame|Content-Security)"

# Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'

# Test rate limiting (should get 429 after 5 requests)
for i in {1..10}; do
  curl -X POST https://your-domain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test","password":"test"}' \
    -w "\nStatus: %{http_code}\n"
done
```

---

## Post-Deployment Validation

### Security Headers Check

Verify all security headers are present:

```bash
#!/bin/bash
# check-security-headers.sh

URL="https://your-domain.com"

echo "Checking security headers for $URL"
echo "===================================="

HEADERS=$(curl -sI $URL)

check_header() {
  header=$1
  if echo "$HEADERS" | grep -qi "$header"; then
    echo "✓ $header present"
  else
    echo "✗ $header MISSING"
  fi
}

check_header "Strict-Transport-Security"
check_header "X-Frame-Options"
check_header "X-Content-Type-Options"
check_header "Content-Security-Policy"
check_header "Permissions-Policy"
check_header "X-XSS-Protection"
check_header "Referrer-Policy"
```

### Authentication Flow Test

```bash
# Test complete auth flow
# 1. Login
RESPONSE=$(curl -s -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123!"}')

TOKEN=$(echo $RESPONSE | jq -r '.token')
REFRESH=$(echo $RESPONSE | jq -r '.refreshToken')

echo "Access Token: $TOKEN"
echo "Refresh Token: $REFRESH"

# 2. Access protected resource
curl -H "Authorization: Bearer $TOKEN" \
  https://your-domain.com/api/auth/me

# 3. Refresh token
curl -X POST https://your-domain.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}"

# 4. Logout
curl -X POST https://your-domain.com/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

### Rate Limiting Test

```bash
# Test authentication rate limit (5 req/min)
echo "Testing auth rate limiting..."
for i in {1..7}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST https://your-domain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test","password":"wrong"}')

  echo "Request $i: HTTP $STATUS"

  if [ "$STATUS" = "429" ]; then
    echo "✓ Rate limiting working (got 429 Too Many Requests)"
    break
  fi

  sleep 1
done
```

### Database Verification

```bash
# Connect to production database
psql -U $POSTGRES_USER -d $POSTGRES_DB

# Verify tables
SELECT COUNT(*) as blacklist_count FROM token_blacklist;
SELECT COUNT(*) as active_sessions FROM user_sessions WHERE is_revoked = FALSE;

# Check indexes
SELECT indexname, tablename FROM pg_indexes
WHERE tablename IN ('token_blacklist', 'user_sessions');

# Test cleanup function
SELECT cleanup_expired_blacklist() as expired_tokens_removed;
```

---

## Rollback Procedure

If issues arise, follow this rollback procedure:

### 1. Immediate Rollback (Application)

```bash
# Docker
docker stop intelgraph-api
docker start intelgraph-api-old

# PM2
pm2 stop intelgraph-api
pm2 start intelgraph-api-old

# Kubernetes
kubectl rollout undo deployment/intelgraph-api
```

### 2. Database Rollback

**Warning**: Only rollback database if absolutely necessary!

```bash
# Restore from backup
psql -U $POSTGRES_USER -d $POSTGRES_DB < backup_YYYYMMDD_HHMMSS.sql

# Or drop new tables manually
psql -U $POSTGRES_USER -d $POSTGRES_DB <<EOF
DROP TABLE IF EXISTS token_blacklist CASCADE;
ALTER TABLE user_sessions DROP COLUMN IF EXISTS is_revoked;
DROP FUNCTION IF EXISTS cleanup_expired_blacklist();
DROP FUNCTION IF EXISTS cleanup_revoked_sessions();
EOF
```

### 3. Environment Rollback

```bash
# Revert environment variables
export JWT_EXPIRES_IN="24h"  # Back to old expiry
export OWASP_SECURITY_ENABLED="false"
export ENABLE_TOKEN_BLACKLIST="false"

# Restart application
pm2 restart intelgraph-api
```

### 4. Verify Rollback

```bash
# Check application health
curl https://your-domain.com/health

# Test authentication
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Check logs for errors
tail -f /var/log/intelgraph/app.log
```

---

## Monitoring & Alerts

### Set Up Monitoring

#### Application Metrics

Monitor these security-related metrics:

```javascript
// Prometheus metrics example
const metrics = {
  auth_attempts_total: new Counter({
    name: 'auth_attempts_total',
    help: 'Total authentication attempts',
    labelNames: ['result'], // success, failed
  }),

  token_refresh_total: new Counter({
    name: 'token_refresh_total',
    help: 'Total token refresh attempts',
  }),

  token_blacklist_size: new Gauge({
    name: 'token_blacklist_size',
    help: 'Number of blacklisted tokens',
  }),

  rate_limit_hits_total: new Counter({
    name: 'rate_limit_hits_total',
    help: 'Rate limit violations',
    labelNames: ['endpoint'],
  }),
};
```

#### Database Monitoring

```sql
-- Monitor token blacklist growth
SELECT COUNT(*) as blacklisted_tokens,
       COUNT(*) FILTER (WHERE expires_at > NOW()) as active_blacklist,
       COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_blacklist
FROM token_blacklist;

-- Monitor session revocations
SELECT COUNT(*) as total_sessions,
       COUNT(*) FILTER (WHERE is_revoked = TRUE) as revoked_sessions,
       COUNT(*) FILTER (WHERE is_revoked = FALSE) as active_sessions
FROM user_sessions;
```

### Configure Alerts

#### Critical Alerts (Immediate notification)

1. **High Failed Login Rate**
   ```
   rate(auth_attempts_total{result="failed"}[5m]) > 10
   ```

2. **Excessive Token Blacklisting**
   ```
   rate(token_blacklist_size[1h]) > 100
   ```

3. **Rate Limit Violations**
   ```
   rate(rate_limit_hits_total[5m]) > 50
   ```

#### Warning Alerts (Daily digest)

1. **Blacklist Size Growing**
   ```
   token_blacklist_size > 10000
   ```

2. **Old Tokens Not Cleaned**
   ```
   (SELECT COUNT(*) FROM token_blacklist WHERE expires_at < NOW() - INTERVAL '7 days') > 0
   ```

### Logging

Ensure these events are logged:

- All authentication attempts (success/failure)
- Token refreshes and rotations
- Token revocations
- Rate limit violations
- Security header violations
- Database connection issues

Example log query (Splunk/ELK):

```
index=intelgraph level=warn OR level=error
| stats count by event, user_id
| where count > 10
```

---

## Maintenance Schedule

### Daily Tasks

- [x] Review failed login attempts
- [x] Check rate limit violations
- [x] Monitor token blacklist size

### Weekly Tasks

- [x] Review security audit logs
- [x] Check for new vulnerabilities (`npm audit`)
- [x] Verify backup integrity

### Monthly Tasks

- [x] Rotate non-critical secrets
- [x] Review and update Dependabot PRs
- [x] Security patch deployment
- [x] Performance tuning

### Quarterly Tasks

- [x] Rotate all JWT secrets
- [x] Comprehensive penetration testing
- [x] Security training review
- [x] Incident response drill

---

## Troubleshooting

### Issue: Users Can't Login After Deployment

**Symptom**: 401 Unauthorized errors

**Solution**:
1. Check JWT_SECRET matches between deployments
2. Verify database migrations ran successfully
3. Check token expiry settings
4. Review application logs

```bash
# Check logs
tail -f /var/log/intelgraph/app.log | grep "Authentication failed"

# Verify JWT secret
echo $JWT_SECRET | wc -c  # Should be 64+ characters
```

### Issue: High Rate Limit Errors

**Symptom**: Many 429 errors

**Solution**:
1. Check if legitimate traffic spike
2. Verify rate limits configured correctly
3. Consider increasing limits temporarily

```bash
# Check current rate limits
echo "Auth: $RATE_LIMIT_AUTH_MAX req/min"
echo "GraphQL: $RATE_LIMIT_GRAPHQL_MAX req/min"
echo "REST: $RATE_LIMIT_API_MAX req/hour"

# Increase temporarily if needed
export RATE_LIMIT_AUTH_MAX=10
pm2 restart intelgraph-api
```

### Issue: Token Blacklist Table Growing

**Symptom**: Performance degradation

**Solution**:
1. Verify cleanup job is running
2. Manually run cleanup
3. Check for issues with token expiry

```sql
-- Check blacklist size
SELECT COUNT(*),
       pg_size_pretty(pg_total_relation_size('token_blacklist')) as size
FROM token_blacklist;

-- Run cleanup manually
SELECT cleanup_expired_blacklist();

-- Verify cleanup worked
SELECT COUNT(*) FROM token_blacklist WHERE expires_at < NOW();
```

---

## Additional Resources

- [SECURITY_GUIDELINES.md](./SECURITY_GUIDELINES.md) - Comprehensive security documentation
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

## Support

For security-related issues or questions:

- **Email**: security@intelgraph.com
- **Slack**: #security-team
- **On-Call**: +1-XXX-XXX-XXXX

**For security incidents, follow the incident response playbook immediately.**

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-20
**Next Review**: 2026-02-20
