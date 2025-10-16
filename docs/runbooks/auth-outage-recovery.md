# 🔐 Authentication Outage Recovery Runbook

**Severity:** Critical
**MTTR Target:** < 5 minutes
**Escalation:** Immediate (P0 incident)

## 🔍 Symptoms

- Users unable to login to web interface
- API returning 401 Unauthorized errors
- JWT validation failures in application logs
- Authentication service health checks failing

## ⚡ Immediate Response (0-2 minutes)

### 1. Verify Outage Scope

```bash
# Check authentication service status
kubectl get pods -n intelgraph-prod -l app=auth-service

# Test authentication endpoint
curl -f https://auth.intelgraph.ai/health || echo "AUTH SERVICE DOWN"

# Check JWT issuer availability
curl -f https://auth.intelgraph.ai/.well-known/jwks.json || echo "JWKS ENDPOINT DOWN"
```

### 2. Enable Emergency Bypass (Break-Glass)

```bash
# Activate emergency authentication bypass
kubectl patch configmap intelgraph-config -n intelgraph-prod --patch='
{
  "data": {
    "AUTH_BYPASS_ENABLED": "true",
    "AUTH_BYPASS_EXPIRY": "'$(date -d '+2 hours' -u +%Y-%m-%dT%H:%M:%SZ)'",
    "EMERGENCY_ACCESS_MODE": "true"
  }
}'

# Restart application to pick up emergency config
kubectl rollout restart deployment/intelgraph -n intelgraph-prod
```

### 3. Create Emergency Admin Access

```bash
# Generate temporary admin token (valid for 2 hours)
EMERGENCY_TOKEN=$(kubectl exec -n intelgraph-prod deployment/intelgraph -- \
    node -e "
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        sub: 'emergency-admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7200,
        roles: ['admin', 'emergency'],
        emergency: true
      },
      process.env.JWT_EMERGENCY_SECRET || 'emergency-fallback-secret'
    );
    console.log(token);
")

echo "🚨 EMERGENCY TOKEN (2h expiry): $EMERGENCY_TOKEN"
```

## 🔧 Authentication Service Recovery (2-5 minutes)

### External Identity Provider Issues

#### 1. Check Provider Status

```bash
# Verify external OAuth providers (Okta, Auth0, etc.)
curl -f https://your-tenant.okta.com/.well-known/openid_configuration
curl -f https://your-domain.auth0.com/.well-known/openid_configuration

# Check DNS resolution
nslookup your-tenant.okta.com
nslookup your-domain.auth0.com
```

#### 2. Fallback to Local Authentication

```bash
# Switch to local authentication mode
kubectl patch configmap intelgraph-config -n intelgraph-prod --patch='
{
  "data": {
    "AUTH_PROVIDER": "local",
    "OAUTH_ENABLED": "false",
    "LOCAL_AUTH_ENABLED": "true"
  }
}'

# Create emergency local user
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
INSERT INTO users (id, username, email, password_hash, roles, created_at)
VALUES (
  'emergency-admin-001',
  'emergency-admin',
  'admin@intelgraph.ai',
  '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 'password'
  '{\"admin\", \"emergency\"}',
  NOW()
) ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  roles = EXCLUDED.roles,
  updated_at = NOW();
"
```

### Internal Authentication Service Issues

#### 1. Service Recovery

```bash
# Check auth service logs
kubectl logs -n intelgraph-prod deployment/auth-service --tail=50

# Restart auth service
kubectl rollout restart deployment/auth-service -n intelgraph-prod

# Wait for auth service readiness
kubectl wait --for=condition=available --timeout=120s deployment/auth-service -n intelgraph-prod
```

#### 2. JWT Secret Recovery

```bash
# Check if JWT secrets are accessible
kubectl get secret -n intelgraph-prod jwt-secrets -o yaml

# If secrets corrupted, regenerate from backup
kubectl delete secret jwt-secrets -n intelgraph-prod
sops -d secrets/jwt-secrets.encrypted.yml | kubectl apply -f -

# Restart all services using JWT
kubectl rollout restart deployment/intelgraph -n intelgraph-prod
kubectl rollout restart deployment/auth-service -n intelgraph-prod
```

### Database Authentication Issues

#### 1. User Database Recovery

```bash
# Check user table accessibility
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
SELECT COUNT(*) FROM users WHERE active = true;
SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW();
"

# Clear corrupted sessions
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
DELETE FROM user_sessions WHERE expires_at < NOW();
VACUUM user_sessions;
"
```

#### 2. Permission Recovery

```bash
# Reset user permissions to known good state
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
UPDATE users SET roles = '{\"user\"}' WHERE 'admin' != ANY(roles);
UPDATE users SET roles = '{\"admin\", \"user\"}' WHERE email IN (
  'admin@intelgraph.ai',
  'sre@intelgraph.ai'
);
"
```

## 🔄 Verification & Recovery (Final 1 minute)

```bash
# Test authentication flow
curl -X POST https://auth.intelgraph.ai/login \
    -H "Content-Type: application/json" \
    -d '{"username": "emergency-admin", "password": "password"}'

# Verify JWT validation
curl -H "Authorization: Bearer $EMERGENCY_TOKEN" \
    https://api.intelgraph.ai/auth/verify

# Check user session creation
curl -X POST https://api.intelgraph.ai/graphql \
    -H "Authorization: Bearer $EMERGENCY_TOKEN" \
    -d '{"query": "{ me { id username roles } }"}'

# Monitor authentication success rate
curl -s "http://prometheus.intelgraph-prod.svc.cluster.local:9090/api/v1/query?query=rate(auth_attempts_total{status=\"success\"}[2m])"
```

## 📢 User Communication

```bash
# Update status page
curl -X POST https://status.intelgraph.ai/api/incidents \
    -H "Authorization: Bearer $STATUS_PAGE_TOKEN" \
    -d '{
      "name": "Authentication Service Recovery",
      "status": "monitoring",
      "message": "Authentication services are recovering. Emergency access is available for critical operations.",
      "component_id": "auth-service"
    }'
```

## 🚨 Break-Glass User Creation

### 2-User Break-Glass Process

#### User 1: Emergency Admin

```bash
# Create with 2-hour time-boxed access
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
INSERT INTO emergency_access (
  user_id, username, access_level, expires_at, created_by, reason
) VALUES (
  'break-glass-admin-1',
  'emergency-admin-1',
  'full-admin',
  NOW() + INTERVAL '2 hours',
  'automation',
  'Authentication outage recovery'
);"
```

#### User 2: Emergency Operator

```bash
# Create with read-only + restart permissions
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
INSERT INTO emergency_access (
  user_id, username, access_level, expires_at, created_by, reason
) VALUES (
  'break-glass-ops-1',
  'emergency-ops-1',
  'read-restart',
  NOW() + INTERVAL '2 hours',
  'automation',
  'Authentication outage support'
);"
```

### Auto-Revocation

```bash
# Set up automatic access revocation
kubectl create job emergency-access-cleanup --from=cronjob/hourly-cleanup -n intelgraph-prod

# Manual revocation command
kubectl exec -n intelgraph-prod deployment/postgres -- psql -U postgres -d intelgraph -c "
UPDATE emergency_access SET revoked_at = NOW() WHERE expires_at > NOW();
"
```

## 📊 Post-Recovery Monitoring

```bash
# Enhanced authentication monitoring for 24h
kubectl patch configmap intelgraph-config -n intelgraph-prod --patch='
{
  "data": {
    "AUTH_DEBUG_LOGGING": "true",
    "AUTH_METRICS_DETAILED": "true",
    "SESSION_MONITORING_ENHANCED": "true"
  }
}'

# Monitor authentication success rates
watch -n 10 'curl -s "http://prometheus.intelgraph-prod.svc.cluster.local:9090/api/v1/query?query=rate(auth_attempts_total[5m])" | jq'
```

## 🔍 Common Authentication Failure Causes

1. **JWT Secret Rotation** → Coordinate secret updates across all services
2. **Identity Provider Outage** → Implement multiple provider fallback
3. **Certificate Expiry** → Automated certificate renewal monitoring
4. **Database Connection Issues** → Connection pool monitoring and recovery
5. **Network Policy Changes** → Authentication service connectivity validation

## 📈 Prevention Measures

1. **Multi-Provider Setup** → Configure Okta + Auth0 + Local fallback
2. **JWT Secret Rotation** → Automated rotation with grace periods
3. **Health Check Enhancement** → Authentication flow end-to-end testing
4. **Break-Glass Testing** → Monthly break-glass procedure validation

**Runbook Owner:** Security Team
**Last Updated:** September 23, 2025
**Emergency Contact:** +1-555-0199 (24/7 SRE Hotline)
