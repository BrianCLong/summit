# Maestro Deployment Guide

This document outlines the deployment process for the Maestro Build Plane UI to production environments.

## Prerequisites

- Node.js 18+
- SSH access to deployment target
- Environment variables configured
- Grafana instance set up (optional)

## Environment Configuration

The application supports three environments with corresponding configuration files:

### Development (`.env.development`)

- Local development with mock services
- OIDC via local Keycloak
- No authentication required for some features

### Staging (`.env.staging`)

- Pre-production testing environment
- Limited feature flags enabled
- Staging authentication provider

### Production (`.env.production`)

- Full feature set enabled
- Production authentication and monitoring
- Strict security policies

## Build Process

### Standard Build

```bash
npm run build
```

### Production Build (Recommended)

```bash
npm run build:production
```

This script:

- ✅ Runs type checking and linting
- 🏗️ Builds with production optimizations
- 📊 Analyzes bundle size
- 🛡️ Generates integrity hashes
- 📄 Creates build manifest
- 🔒 Performs security checks

### Build Output

```
dist/
├── index.html              # Main entry point
├── assets/
│   ├── css/               # Stylesheets with hashes
│   ├── js/                # JavaScript chunks
│   ├── fonts/             # Font assets
│   └── images/            # Image assets
├── build-manifest.json    # Build metadata
└── integrity.txt          # SRI hashes
```

## Deployment

### Quick Deploy to Production

```bash
npm run deploy:production
```

### Manual Deployment Steps

1. **Build the application:**

   ```bash
   npm run build:production
   ```

2. **Configure deployment target:**

   ```bash
   export DEPLOY_TARGET="maestro-dev.topicality.co"
   export DEPLOY_USER="deployer"
   export DEPLOY_PATH="/var/www/maestro"
   ```

3. **Deploy:**
   ```bash
   npm run deploy:production
   ```

### Deployment Features

- 💾 **Automatic backups** before deployment
- 🔄 **Atomic deployments** (zero downtime)
- ✅ **Health checks** with automatic rollback
- 🔒 **Security verification**
- 📢 **Webhook notifications** (optional)

## Environment Variables

### Required Production Variables

```bash
VITE_API_BASE_URL=https://maestro-dev.topicality.co/api/maestro/v1
VITE_OIDC_ISSUER=https://auth.topicality.co
VITE_OIDC_CLIENT_ID=maestro-ui-prod
```

### Optional Variables

```bash
# Monitoring
VITE_SENTRY_DSN=your-sentry-dsn
VITE_ANALYTICS_ID=your-analytics-id

# Deployment
DEPLOY_TARGET=maestro-dev.topicality.co
DEPLOY_USER=deployer
WEBHOOK_URL=your-webhook-url
```

## Grafana Setup

Set up monitoring dashboards:

```bash
npm run setup:grafana
```

Required environment variables:

```bash
GRAFANA_URL=https://grafana.maestro-dev.topicality.co
GRAFANA_ADMIN_TOKEN=your-admin-token
PROMETHEUS_URL=http://prometheus:9090
```

## Health Checks

### Application Health

- **URL:** `https://maestro-dev.topicality.co/maestro`
- **Expected:** 200 response with Maestro UI

### Build Information

- **URL:** `https://maestro-dev.topicality.co/maestro/build-manifest.json`
- **Contains:** Version, timestamp, git info

### API Health

- **URL:** `https://maestro-dev.topicality.co/api/maestro/v1/health`
- **Expected:** `{"status": "healthy"}`

## Troubleshooting

### Build Failures

1. **Type errors:**

   ```bash
   npm run type-check
   ```

2. **Linting errors:**

   ```bash
   npm run lint -- --fix
   ```

3. **Bundle too large:**
   ```bash
   npm run bundle:analyze
   ```

### Deployment Failures

1. **Connection issues:**

   ```bash
   ssh deployer@maestro-dev.topicality.co "echo 'Connection test'"
   ```

2. **Permission issues:**

   ```bash
   # On target server
   sudo chown -R www-data:www-data /var/www/maestro
   sudo chmod -R 755 /var/www/maestro
   ```

3. **Rollback:**
   ```bash
   # Automatic rollback on health check failure
   # Manual rollback:
   ssh deployer@maestro-dev.topicality.co "
     sudo cp -r /var/backups/maestro/maestro-YYYYMMDD-HHMMSS /var/www/maestro
   "
   ```

### Performance Issues

1. **Check bundle size:**

   ```bash
   npm run bundle:analyze
   ```

2. **Monitor loading:**
   - Use browser dev tools Network tab
   - Check for failed chunk loading
   - Verify CDN cache headers

3. **Check authentication:**
   - Verify OIDC configuration
   - Check network requests to auth provider
   - Validate JWT tokens

## Security Considerations

### Content Security Policy

The application enforces strict CSP in production:

- No inline scripts or styles
- Limited external domains
- Integrity checks for all assets

### Authentication

- OIDC with PKCE flow
- JWT token validation
- Role-based access control

### Asset Integrity

- Subresource Integrity (SRI) hashes
- Asset fingerprinting
- Secure delivery over HTTPS

## Monitoring & Observability

### Application Metrics

- Page load times
- Bundle download metrics
- Authentication success rates

### Error Tracking

- JavaScript errors via Sentry (optional)
- Network request failures
- Authentication failures

### Dashboards

- Grafana dashboards for infrastructure
- Real-time performance monitoring
- Alert configuration

## Rollback Procedure

If issues are detected after deployment:

1. **Automatic Rollback:**
   - Health checks fail after deployment
   - System automatically restores backup

2. **Manual Rollback:**
   ```bash
   ssh deployer@maestro-dev.topicality.co "
     sudo mv /var/www/maestro /var/www/maestro.failed
     sudo cp -r /var/backups/maestro/maestro-LATEST /var/www/maestro
     sudo chown -R www-data:www-data /var/www/maestro
     sudo systemctl reload nginx
   "
   ```

## Support

For deployment issues:

1. Check this documentation
2. Review deployment logs
3. Verify environment configuration
4. Test in staging environment first

## Quick Reference

```bash
# Build and deploy to production
npm run build:production && npm run deploy:production

# Set up monitoring
npm run setup:grafana

# Run E2E tests
npm run test:e2e

# Bundle analysis
npm run bundle:analyze

# Health check
curl -f https://maestro-dev.topicality.co/maestro
```
