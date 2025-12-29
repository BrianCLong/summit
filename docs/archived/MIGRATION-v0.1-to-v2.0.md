# Migration Guide: v0.1.0 → v2.0.0

## Overview

Summit v2.0.0 introduces significant infrastructure and feature enhancements. This guide covers the upgrade path.

## Pre-Migration Checklist (validated)

- [x] **Backup all databases**: Run `make db:backup` or the automated script (`scripts/migration/upgrade-v0.1-to-v2.0.sh`) to capture Neo4j, PostgreSQL, TimescaleDB, and Redis snapshots.
- [x] **Export current investigations**: `npm run export:investigations` is invoked in the automation to preserve case data before schema changes.
- [x] **Document custom configurations**: Copy your `.env` (or use the script, which creates a timestamped backup) and persist Helm values for rollback parity.
- [x] **Schedule maintenance window**: Target a 2-hour window; the automation keeps commands idempotent so you can safely re-run after pauses.

## Step-by-Step Migration

### 1. Update Environment Variables

Copy new required variables from `.env.production.sample` (or let the automation seed them):

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

- [x] Login to frontend (http://localhost:3000) and verify auth+RBAC flows
- [x] Create test investigation and confirm graph writes succeed
- [x] Upload test document for AI extraction and validate extraction results
- [x] Run narrative simulation with crisis scenario and observe event stream
- [x] Check Grafana dashboards for metrics, SLO, and cache hit rate signals

## Automation and Examples

- **One-shot upgrade**: `RELEASE_TAG=v2.0.0 NAMESPACE=summit bash scripts/migration/upgrade-v0.1-to-v2.0.sh`
- **Manual docker-compose refresh**:
  ```
  docker-compose -f docker-compose.prod.yml pull
  docker-compose -f docker-compose.prod.yml up -d
  npm run db:migrate && npm run db:verify
  make smoke
  ```
- **Helm upgrade (staged)**:
  ```
  helm upgrade summit ./helm/summit \
    --namespace summit \
    --install \
    --set image.tag=v2.0.0 \
    --set rolloutStrategy=canary
  ```

For internal rollout sequencing, see `docs/ops/MIGRATION-COMMS-v0.1-to-v2.0.md` for stakeholder messaging, dry-run timing, and approval checkpoints.

## Need Help?

- **Issues**: https://github.com/BrianCLong/summit/issues
- **Discussions**: https://github.com/BrianCLong/summit/discussions
- **Email**: support@summit.com
