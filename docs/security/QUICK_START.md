# Security Quick Start Guide

Quick reference for developers working with the OWASP-compliant security features.

## 🚀 Getting Started (5 Minutes)

### 1. Set Up Environment

```bash
# Copy environment template
cp server/.env.example server/.env

# Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> server/.env
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> server/.env

# Install dependencies
npm install
```

### 2. Run Database Migration

```bash
# Start PostgreSQL (if using Docker)
docker-compose up -d postgres

# Run migration
psql -U intelgraph -d intelgraph_dev -f server/migrations/007_add_token_security.sql

# Verify
psql -U intelgraph -d intelgraph_dev -c "SELECT COUNT(*) FROM token_blacklist;"
```

### 3. Start Application

```bash
# Development mode
npm run dev

# Check security headers
curl -I http://localhost:4000/ | grep -E "(Strict-Transport|X-Frame|Permissions-Policy)"
```

---

## 🔐 Authentication API Usage

### Register New User

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ANALYST"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "uuid-refresh-token",
  "expiresIn": 86400
}
```

### Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Access Protected Endpoint

```bash
# Export token from login response
export TOKEN="your-access-token"

# Make authenticated request
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/auth/me
```

### Refresh Token

```bash
# When access token expires (after 15 min in prod, 24h in dev)
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

**Note**: The old refresh token is automatically invalidated (token rotation).

### Logout

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

This revokes all user sessions and blacklists the current token.

---

## 🛡️ Security Features Overview

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/*` | 5 requests | 1 minute |
| `/graphql` | 100 requests | 1 minute |
| `/api/*` | 1000 requests | 1 hour |

**Test rate limiting**:
```bash
# This should trigger rate limit (429) after 5 requests
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test","password":"test"}' \
    -w "\nStatus: %{http_code}\n"
done
```

### Security Headers

All responses include:
- `Strict-Transport-Security`: HSTS with 1-year max-age
- `X-Frame-Options`: DENY (prevent clickjacking)
- `X-Content-Type-Options`: nosniff
- `Content-Security-Policy`: Strict CSP
- `Permissions-Policy`: Restricted browser features
- `X-XSS-Protection`: XSS filter enabled

**Verify headers**:
```bash
curl -I http://localhost:4000/ | grep -E "^(Strict|X-|Content-Security|Permissions)"
```

### Token Security

- **Access Tokens**: Short-lived (15 min production, 24h development)
- **Refresh Tokens**: Long-lived (7 days), stored in database
- **Token Rotation**: Old refresh token invalidated on refresh
- **Token Blacklist**: Revoked tokens cannot be reused
- **Automatic Cleanup**: Expired tokens removed daily

---

## 🧪 Testing

### Run Security Audit

```bash
# Comprehensive security check
npm run security:audit

# Check for vulnerabilities
npm audit --audit-level=high

# Fix auto-fixable vulnerabilities
npm audit fix
```

### Run Tests

```bash
# All tests
npm test

# Security-specific tests
npm test -- --grep "security|auth"

# Type check
npm run typecheck
```

### Manual Security Testing

```bash
# 1. Test SQL injection prevention
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin'\''; DROP TABLE users;--","password":"test"}'
# Should return 400/401, not 500

# 2. Test XSS prevention
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"<script>alert(1)</script>@test.com","password":"SecurePass123!"}'
# Should sanitize or reject

# 3. Test CSRF protection (GraphQL)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.com" \
  -d '{"query":"{ __typename }"}'
# Should be blocked by CORS
```

---

## 📊 Security Monitoring

### View Security Logs

```bash
# Failed authentication attempts
grep "Authentication failed" logs/app.log

# Rate limit violations
grep "Rate limit exceeded" logs/app.log

# Token operations
grep "Token" logs/app.log | grep -E "(refreshed|revoked|blacklisted)"

# Security warnings
grep -E "WARN|ERROR" logs/app.log | grep -i security
```

### Database Queries

```sql
-- Check active sessions
SELECT user_id, COUNT(*) as session_count
FROM user_sessions
WHERE is_revoked = FALSE
  AND expires_at > NOW()
GROUP BY user_id
ORDER BY session_count DESC;

-- Check blacklisted tokens
SELECT COUNT(*) as total,
       COUNT(*) FILTER (WHERE expires_at > NOW()) as active,
       COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired
FROM token_blacklist;

-- Recent failed logins (requires audit log table)
SELECT email, COUNT(*) as attempts, MAX(created_at) as last_attempt
FROM audit_logs
WHERE event = 'failed_login'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY email
ORDER BY attempts DESC
LIMIT 10;
```

---

## 🔧 Configuration

### Environment Variables

**Required**:
```bash
JWT_SECRET=<64-char-hex-string>
JWT_REFRESH_SECRET=<64-char-hex-string>
```

**Optional (with defaults)**:
```bash
JWT_EXPIRES_IN=24h                    # Dev: 24h, Prod: 15m
JWT_REFRESH_EXPIRES_IN=7d             # Refresh token lifetime
OWASP_SECURITY_ENABLED=true           # Enable OWASP features
ENABLE_TOKEN_BLACKLIST=true           # Enable token revocation
ENABLE_TOKEN_ROTATION=true            # Rotate refresh tokens
CSP_ENABLED=true                      # Enable CSP headers
HSTS_ENABLED=true                     # Enable HSTS
PERMISSIONS_POLICY_ENABLED=true       # Enable Permissions-Policy
```

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Access Token TTL | 24 hours | 15 minutes |
| Refresh Token TTL | 30 days | 7 days |
| Rate Limiting | Relaxed (2x) | Strict (OWASP) |
| GraphQL Introspection | Enabled | Disabled |
| CSP | Report-only | Enforced |
| Error Details | Full stack | Generic message |

---

## 🐛 Troubleshooting

### Token Expired Error

**Problem**: Getting 401 "Token expired" errors

**Solution**:
1. Refresh the token using the refresh endpoint
2. If refresh token also expired, login again

```bash
# Get new token
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-refresh-token"}'
```

### Rate Limit Error

**Problem**: Getting 429 "Too many requests" errors

**Solution**:
1. Wait for rate limit window to reset
2. Check rate limit headers in response
3. Implement exponential backoff in client

```bash
# Check rate limit headers
curl -I http://localhost:4000/api/auth/login
# Look for: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### CORS Error

**Problem**: CORS blocking requests from frontend

**Solution**:
1. Add your frontend origin to `ALLOWED_ORIGINS`
2. Verify credentials are included in request

```bash
# Update .env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,https://your-frontend.com

# Restart server
npm run dev
```

### Database Connection Error

**Problem**: Cannot connect to PostgreSQL

**Solution**:
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL (Docker)
docker-compose up -d postgres

# Or start locally
brew services start postgresql@14  # macOS
sudo systemctl start postgresql     # Linux
```

---

## 📚 Additional Resources

### Documentation
- [Security Guidelines](./SECURITY_GUIDELINES.md) - Comprehensive security docs
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Security standards

### Tools
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Dependency scanning
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing
- [gitleaks](https://github.com/gitleaks/gitleaks) - Secret scanning

### Testing Endpoints
```bash
# Health check
curl http://localhost:4000/health

# GraphQL (if authenticated)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ __typename }"}'

# API endpoints
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Common Tasks

### Generate New Secrets

```bash
# All secrets at once
./scripts/generate-secrets.sh

# Individual secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Reset User Password (Admin)

```sql
-- Connect to database
psql -U intelgraph -d intelgraph_dev

-- Update password (will be hashed by Argon2)
-- Use AuthService.register() to generate proper hash in application
UPDATE users SET password_hash = '<argon2-hash>' WHERE email = 'user@example.com';

-- Revoke all sessions
UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = (
  SELECT id FROM users WHERE email = 'user@example.com'
);
```

### Clear Token Blacklist

```sql
-- Remove all expired tokens
SELECT cleanup_expired_blacklist();

-- Force remove all (use with caution!)
TRUNCATE token_blacklist;
```

### Check User Sessions

```sql
-- View all active sessions
SELECT u.email, s.refresh_token, s.expires_at, s.created_at
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_revoked = FALSE
  AND s.expires_at > NOW()
ORDER BY s.created_at DESC;

-- Revoke specific session
UPDATE user_sessions
SET is_revoked = TRUE
WHERE refresh_token = 'specific-refresh-token';
```

---

## 💡 Best Practices

1. **Always use HTTPS** in production
2. **Never log sensitive data** (passwords, tokens, PII)
3. **Rotate secrets regularly** (every 90 days)
4. **Keep dependencies updated** (check Dependabot PRs weekly)
5. **Use environment variables** for all configuration
6. **Enable MFA** for admin accounts
7. **Monitor security logs** daily
8. **Run security audits** before each deployment
9. **Follow least privilege principle** for user roles
10. **Document security incidents** in detail

---

## 🆘 Getting Help

- **Bug Reports**: Create GitHub issue with `security` label
- **Security Vulnerabilities**: Email security@intelgraph.com (do NOT create public issue)
- **Questions**: Ask in #security-team Slack channel
- **Documentation**: Check `/docs/security/` folder

---

**Quick Links**:
- [SECURITY_GUIDELINES.md](./SECURITY_GUIDELINES.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [API Documentation](../api/README.md)

**Last Updated**: 2025-11-20
