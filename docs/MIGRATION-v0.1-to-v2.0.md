# Migration Guide: v0.1.0 → v2.0.0

## Overview
Summit v2.0.0 introduces significant infrastructure and feature enhancements. This guide covers the upgrade path.

## Pre-Migration Checklist

- [ ] **Backup all databases**: Neo4j, PostgreSQL, TimescaleDB, Redis
- [ ] **Export current investigations**: Use `npm run export:investigations`
- [ ] **Document custom configurations**: Save your `.env` and Helm values
- [ ] **Schedule maintenance window**: Recommended 2-hour window for migration

## Step-by-Step Migration

### 1. Update Environment Variables

Copy new required variables from `.env.production.sample`:

```
# Append new variables to your .env
cat .env.production.sample >> .env

# Edit .env to set your values
vim .env
```

**Critical new variables**:
- `LB_ALGORITHM`, `CACHE_L1_MAX_SIZE`, `OTEL_EXPORTER_ENDPOINT`
- `NARRATIVE_SIM_ENABLED`, `BLACK_PROJECTS_ENABLED`

### 2. Run Database Migrations

```
# Backup databases first
make db:backup

# Run migrations (includes new tables)
npm run db:migrate

# Verify migration success
npm run db:verify
```

### 3. Update Docker Images

```
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Or with Helm
helm upgrade summit ./helm/summit \
  --set image.tag=v2.0.0 \
  --namespace summit
```

### 4. Verify Health Checks

```
# Check all services
curl http://localhost:4000/health/detailed | jq

# Should return all services as "healthy"
```

### 5. Run Smoke Tests

```
make smoke

# Expected output: All tests passing
```

## Breaking Changes Details

### API Changes

#### New Endpoints
- `POST /api/narrative-sim/simulations` - Create narrative simulation
- `GET /api/black-projects/*` - Access Black Projects modules

#### Modified Endpoints
- All GraphQL queries now include `X-RateLimit-*` headers
- Persisted queries required in production mode

### Database Schema Changes

#### New Tables
- `narrative_simulations` - Simulation state storage
- `narrative_events` - Event history
- `black_projects_*` - Eight new tables for Black Projects

#### Modified Tables
- `entities` - New indexes for performance
- `relationships` - Foreign key constraints tightened

### Configuration Changes

#### Removed (deprecated)
- `CACHE_ENABLED` → Use `CACHE_L1_MAX_SIZE=0` to disable
- `SIMPLE_RATE_LIMIT` → Now Redis-backed only

#### Renamed
- `JWT_EXPIRY` → `JWT_ACCESS_EXPIRY`
- `REDIS_URL` → `REDIS_HOST` + `REDIS_PORT`

## Rollback Plan

If migration fails:

```
# 1. Restore database backups
make db:restore

# 2. Revert to v0.1.0
helm rollback summit --namespace summit

# 3. Verify old version works
curl http://localhost:4000/health
```

## Post-Migration Validation

- [ ] Login to frontend (http://localhost:3000)
- [ ] Create test investigation
- [ ] Upload test document for AI extraction
- [ ] Run narrative simulation with crisis scenario
- [ ] Check Grafana dashboards for metrics

## Need Help?

- **Issues**: https://github.com/BrianCLong/summit/issues
- **Discussions**: https://github.com/BrianCLong/summit/discussions
- **Email**: support@summit.com

