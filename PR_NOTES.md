# Demo Up Feature PR Notes

## Summary

This PR adds a one-command demo up workflow for the Summit Platform, allowing non-technical users to launch a working demo environment with seeded sample data.

## Changes Made

### 1. Scripts Added

- `scripts/demo-up.sh`: Main script that verifies prerequisites, brings up services, waits for health, and seeds demo data
- `scripts/demo-seed.sh`: Script that handles demo data seeding with proper DEMO_MODE gating
- `scripts/demo-check.sh`: Test script to verify DEMO_MODE safety checks
- `scripts/demo-smoke-test.sh`: Smoke test to verify demo functionality

### 2. Makefile Update

- Added `demo` target to Makefile for easy access

### 3. README Update

- Added comprehensive "Demo" section with prerequisites, usage instructions, and stopping procedures

## Safety Features

- Refuses to run if NODE_ENV=production
- Only runs when DEMO_MODE=1 is explicitly set
- Includes prerequisite checks for Docker, Node.js, etc.
- Idempotent operation (safe to run multiple times)

## Usage

```bash
# Using make command
make demo

# Or directly with proper environment
DEMO_MODE=1 ./scripts/demo-up.sh
```

## What's Included

- Frontend UI at http://localhost:3000
- GraphQL API at http://localhost:4000/graphql
- Neo4j Database at http://localhost:7474
- PostgreSQL Database at http://localhost:8080 (Adminer)
- Monitoring (Grafana, Prometheus)
- Pre-seeded demo data

## Stopping Demo

```bash
docker compose -f docker-compose.yml down
```
