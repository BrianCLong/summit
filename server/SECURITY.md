# IntelGraph Security Guide

## Environment Configuration & Secrets Management

This document outlines the security practices and configuration management for the IntelGraph platform.

## Quick Start

For development setup with secure defaults:
```bash
npm run setup:env
npm run migrate
npm run dev
```

For production deployment:
```bash
# Use the production template
cp .env.production.template .env
# Edit .env with production values
npm run secrets:generate  # Generate new secrets
```

## Environment Variables

### Required Configuration

#### Application Settings
- `NODE_ENV` - Environment (development|test|staging|production)
- `PORT` - Server port (default: 8080)

#### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string (required)
- `NEO4J_URI` - Neo4j connection URI
- `NEO4J_USER` - Neo4j username
- `NEO4J_PASSWORD` - Neo4j password (min 6 chars)

#### Redis Configuration
- `REDIS_HOST` - Redis server host
- `REDIS_PORT` - Redis server port
- `REDIS_PASSWORD` - Redis password (required in production)

#### Security (Critical)
- `JWT_SECRET` - JWT signing secret (min 32 chars, hex recommended)
- `JWT_REFRESH_SECRET` - JWT refresh token secret (min 32 chars, different from JWT_SECRET)
- `SESSION_SECRET` - Session encryption secret (min 32 chars)
- `ENCRYPTION_KEY` - Data encryption key (64 chars hex for AES-256)

#### OIDC Authentication (Required in Production)
- `OIDC_ISSUER` - OIDC provider issuer URL
- `OIDC_CLIENT_ID` - Application client ID
- `OIDC_CLIENT_SECRET` - Application client secret
- `OIDC_REDIRECT_URI` - Callback URL for authentication

### Optional Configuration

#### External APIs
- `OPENAI_API_KEY` - OpenAI API key (starts with 'sk-')
- `VIRUSTOTAL_API_KEY` - VirusTotal API key (64 chars)

#### Security & Performance
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window (default: 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

#### TLS Configuration
- `TLS_KEY_PATH` - Path to TLS private key
- `TLS_CERT_PATH` - Path to TLS certificate

## Security Best Practices

### 1. Secret Generation

Generate cryptographically secure secrets:

```bash
# Generate all secrets at once
npm run secrets:generate

# Generate individual secrets
node -e "console.log('SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Environment-Specific Configuration

#### Development
- Uses secure random secrets (auto-generated)
- Points to local database services
- Enables debug logging
- Relaxed CORS policies

#### Production
- **Must** use environment-specific secrets
- **Must** configure OIDC authentication
- **Must** use production database URLs
- **Must** set appropriate CORS origins
- **Should** use TLS certificates
- **Should** use secure session configuration

### 3. Production Security Checklist

Before deploying to production, ensure:

- [ ] All secrets are environment-specific (not development defaults)
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are different and secure
- [ ] Database URLs don't contain development credentials
- [ ] OIDC configuration is complete and validated
- [ ] Redis authentication is enabled
- [ ] CORS origins are restricted to production domains
- [ ] TLS is configured (recommended)
- [ ] Rate limiting is appropriate for production load
- [ ] Logging level is set to 'info' or 'warn'

### 4. Secret Rotation

Regular secret rotation is recommended:

#### JWT Secrets
- Rotate monthly in production
- Use graceful rotation (accept both old and new for transition period)

#### Database Credentials
- Rotate quarterly
- Use connection pooling for seamless transitions

#### OIDC Credentials
- Rotate as required by your identity provider
- Update configuration during maintenance windows

## Role-Based Access Control (RBAC)

### Roles and Permissions

#### ADMIN
- Wildcard access to all operations
- Can manage users, pipelines, and system configuration

#### ANALYST
- Full investigation and entity management
- Can create, update, and execute pipelines
- Dashboard and autonomy management access

#### OPERATOR
- Pipeline execution and management focus
- Limited to operational tasks
- Can update executors and manage runs

#### VIEWER
- Read-only access to all resources
- Cannot modify pipelines or system settings

### API Permissions

Each API endpoint is protected by specific permissions:

- `pipeline:*` - Pipeline management
- `run:*` - Pipeline execution management
- `dashboard:read` - Dashboard access
- `autonomy:*` - Autonomy configuration
- `executor:*` - Executor management
- `recipe:read` - Recipe/template access

## Authentication Flow

### OIDC Integration

1. **Frontend** redirects to OIDC provider
2. **OIDC Provider** authenticates user
3. **Backend** receives authorization code
4. **Backend** exchanges code for tokens
5. **Backend** validates user and creates session
6. **API calls** use JWT tokens for authentication

### JWT Token Management

- Access tokens expire in 24 hours (configurable)
- Refresh tokens expire in 7 days (configurable)
- Tokens include user role and permissions
- All API endpoints validate token and permissions

## Database Security

### PostgreSQL
- Uses connection pooling for performance
- Supports SSL/TLS connections
- Role-based database access (maestro_app, maestro_readonly)
- Prepared statements prevent SQL injection

### Neo4j
- Bolt protocol with authentication
- Cypher query parameterization
- Read-only queries for public access

### Redis
- Password authentication required in production
- Used for session storage and caching
- Data expiration for security

## Monitoring & Auditing

### Security Events Logged
- Authentication failures
- Permission denials
- Admin actions
- Secret rotation events

### Metrics Collected
- API response times
- Error rates
- Authentication success/failure rates
- Rate limiting violations

## Incident Response

### Security Incident Checklist

1. **Immediate Response**
   - Identify affected systems
   - Isolate compromised components
   - Preserve logs and evidence

2. **Containment**
   - Rotate compromised secrets
   - Revoke affected user sessions
   - Update firewall rules if needed

3. **Recovery**
   - Deploy security updates
   - Verify system integrity
   - Monitor for continued threats

4. **Post-Incident**
   - Document incident and response
   - Update security procedures
   - Schedule security review

## Development Security

### Code Security
- Dependencies are regularly updated
- Security linting enabled (ESLint security rules)
- No secrets in code or version control
- Input validation on all endpoints

### Development Environment
- Uses secure random defaults
- Isolated from production systems
- Regular security updates

## Compliance

### Data Protection
- PII is encrypted at rest
- Audit logs are maintained
- Data retention policies enforced
- GDPR-compliant data handling

### Access Controls
- Principle of least privilege
- Regular access reviews
- Multi-factor authentication supported
- Session management

## Support

For security questions or incident reporting:
- Create an issue in the repository
- Use security-specific tags for urgent matters
- Follow responsible disclosure for vulnerabilities

## Security Updates

This security guide is updated with each release. Check the changelog for security-related updates and always follow the latest security practices.