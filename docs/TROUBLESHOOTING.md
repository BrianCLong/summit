# 🔧 Troubleshooting Guide - Summit/IntelGraph

> **Purpose**: Comprehensive troubleshooting guide for common development issues
> **Last Updated**: 2025-11-20

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Installation Issues](#installation-issues)
- [Docker & Container Issues](#docker--container-issues)
- [Database Issues](#database-issues)
- [Build & Compilation Issues](#build--compilation-issues)
- [Testing Issues](#testing-issues)
- [Network & Port Issues](#network--port-issues)
- [Performance Issues](#performance-issues)
- [Git & Version Control](#git--version-control)
- [Environment & Configuration](#environment--configuration)
- [Getting Help](#getting-help)

---

## Quick Diagnostics

### Run Health Checks

```bash
# Check all service health
make health

# Or manually
curl http://localhost:4000/health
curl http://localhost:4000/health/ready
curl http://localhost:4000/health/live

# Check Docker services status
docker compose ps

# View recent logs
make logs
```

### Golden Path Quick Check

```bash
# This should work on fresh clone
make bootstrap && make up && make smoke

# If this fails, check which step fails:
make bootstrap  # Does this complete?
make up        # Do services start?
make smoke     # Do tests pass?
```

---

## Installation Issues

### Issue: \`pnpm install\` fails

**Symptoms:**
- \`ERR_PNPM_FETCH_*\` errors
- Package resolution failures
- Lock file conflicts

**Solutions:**

```bash
# Solution 1: Clear caches and reinstall
rm -rf node_modules
rm -rf pnpm-lock.yaml
pnpm store prune
pnpm install

# Solution 2: Update pnpm
corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm --version  # Verify version 9.12.3 or higher

# Solution 3: Check Node version
node --version  # Should be >= 18.18

# Solution 4: Use exact Node version
nvm use 18.18.0  # or your preferred LTS version
pnpm install
```

### Issue: \`make bootstrap\` fails

**Symptoms:**
- Script errors during setup
- Missing dependencies
- Permission errors

**Solutions:**

```bash
# Check prerequisites
node --version    # >= 18.18
pnpm --version    # >= 9.12.0
docker --version  # >= 20.10

# Fix permissions (macOS/Linux)
chmod +x scripts/*.sh
chmod +x scripts/**/*.sh

# Run bootstrap steps manually
pnpm install
cp .env.example .env
python3 -m venv venv  # If using Python features

# Check for Python dependencies (if applicable)
python3 --version  # >= 3.11
pip install -r requirements.txt  # If file exists
```

### Issue: Husky/Git hooks not installing

**Symptoms:**
- Pre-commit hooks don't run
- \`husky install\` fails

**Solutions:**

```bash
# Reinstall Husky
rm -rf .husky/_
pnpm install
pnpm run prepare

# Verify hooks installed
ls -la .husky/
cat .husky/pre-commit

# Make hooks executable
chmod +x .husky/*

# Test hook manually
bash .husky/pre-commit
```

---

## Docker & Container Issues

### Issue: Docker services won't start

**Symptoms:**
- \`make up\` fails
- Containers exit immediately
- Port binding errors

**Solutions:**

```bash
# Solution 1: Check if ports are already in use
lsof -i :3000  # Frontend
lsof -i :4000  # API
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :7474  # Neo4j HTTP
lsof -i :7687  # Neo4j Bolt

# Kill processes using ports
kill -9 $(lsof -ti:3000)

# Solution 2: Clean Docker state
make down
docker system prune -af --volumes
docker network prune -f

# Solution 3: Check Docker resources
# Docker Desktop → Preferences → Resources
# - Memory: >= 8GB
# - CPUs: >= 4
# - Disk: >= 20GB free

# Solution 4: Restart Docker
# macOS: Docker Desktop → Restart
# Linux: sudo systemctl restart docker

# Solution 5: Check Docker Compose version
docker compose version  # Should be v2.x

# Solution 6: Rebuild containers
make down
docker compose -f docker-compose.dev.yml build --no-cache
make up
```

### Issue: Services unhealthy or restarting

**Symptoms:**
- \`docker compose ps\` shows unhealthy status
- Containers constantly restarting
- Services fail health checks

**Solutions:**

```bash
# Check specific service logs
docker compose -f docker-compose.dev.yml logs neo4j
docker compose -f docker-compose.dev.yml logs postgres
docker compose -f docker-compose.dev.yml logs server
docker compose -f docker-compose.dev.yml logs client

# Increase startup timeout
# Edit docker-compose.dev.yml and increase healthcheck intervals

# Restart specific service
docker compose -f docker-compose.dev.yml restart neo4j

# Check resource usage
docker stats

# Access container shell for debugging
docker exec -it summit-server-1 /bin/sh
docker exec -it summit-neo4j-1 /bin/bash
```

### Issue: Volume permission errors

**Symptoms:**
- Permission denied errors in containers
- Cannot write to mounted volumes
- UID/GID mismatch errors

**Solutions:**

```bash
# macOS (usually not an issue with Docker Desktop)
# Linux: Fix ownership
sudo chown -R $USER:$USER ./data
sudo chown -R $USER:$USER ./logs

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Verify docker group membership
groups | grep docker
```

---

## Database Issues

### Issue: Neo4j won't start

**Symptoms:**
- Neo4j container exits
- Cannot connect to Neo4j
- Browser at localhost:7474 not loading

**Solutions:**

```bash
# Check Neo4j logs
docker compose logs neo4j

# Common issues:
# 1. Memory constraints - increase Docker memory to 8GB
# 2. Data directory corruption - reset data

# Reset Neo4j data (WARNING: loses all data)
make down
rm -rf data/neo4j
make up

# Wait for Neo4j to be ready
./scripts/wait-for-stack.sh

# Verify Neo4j connection
docker exec summit-neo4j-1 cypher-shell -u neo4j -p devpassword "RETURN 1"

# Access Neo4j shell
docker exec -it summit-neo4j-1 cypher-shell -u neo4j -p devpassword
```

### Issue: PostgreSQL connection errors

**Symptoms:**
- \`ECONNREFUSED\` errors
- \`password authentication failed\`
- Cannot connect to database

**Solutions:**

```bash
# Check PostgreSQL logs
docker compose logs postgres

# Verify PostgreSQL is running
docker exec summit-postgres-1 pg_isready

# Test connection
docker exec summit-postgres-1 psql -U summit -d summit -c "SELECT version();"

# Reset PostgreSQL (WARNING: loses all data)
make down
docker volume rm summit_postgres_data
make up

# Check .env database settings
cat .env | grep DB_
cat .env | grep POSTGRES_
```

### Issue: Database migrations fail

**Symptoms:**
- Migration errors on startup
- Schema out of sync
- Duplicate migration errors

**Solutions:**

```bash
# Check migration status
pnpm db:pg:status

# Prisma migrations
pnpm db:pg:migrate

# Knex migrations
pnpm db:knex:migrate

# Neo4j migrations
pnpm db:neo4j:migrate

# Reset all databases (WARNING: loses all data)
make down
docker volume prune -f
make up
pnpm db:migrate
```

---

## Build & Compilation Issues

### Issue: TypeScript compilation errors

**Symptoms:**
- \`tsc\` errors
- Type mismatch errors
- Cannot find module errors

**Solutions:**

```bash
# Rebuild TypeScript project references
pnpm typecheck

# Clean and rebuild
rm -rf dist
rm -rf .turbo
rm -rf node_modules/.cache
pnpm build

# Check specific package
cd packages/my-package
pnpm build

# Clear TypeScript cache
rm -rf node_modules/.cache/typescript

# Regenerate TypeScript types
pnpm graphql:codegen  # If using GraphQL codegen
```

### Issue: Build fails with memory errors

**Symptoms:**
- \`JavaScript heap out of memory\`
- Build process killed
- OOM errors

**Solutions:**

```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=8192"

# Or set in package.json script:
# "build": "NODE_OPTIONS=--max-old-space-size=8192 turbo run build"

# Build packages individually
pnpm --filter @intelgraph/package1 build
pnpm --filter @intelgraph/package2 build

# Disable parallel builds
turbo run build --concurrency=1
```

### Issue: Turbo cache issues

**Symptoms:**
- Stale build artifacts
- Cache hits but broken builds
- Inconsistent build results

**Solutions:**

```bash
# Clear Turbo cache
rm -rf .turbo
rm -rf node_modules/.cache

# Force rebuild without cache
turbo run build --force

# Check turbo.json configuration
cat turbo.json

# Reset everything
make clean  # If available
pnpm install
pnpm build
```

---

## Testing Issues

### Issue: Tests failing unexpectedly

**Symptoms:**
- Previously passing tests now fail
- Intermittent test failures
- Different results locally vs CI

**Solutions:**

```bash
# Clear Jest cache
jest --clearCache

# Run tests without cache
pnpm test -- --no-cache

# Run specific test
pnpm test -- path/to/test.test.ts

# Run with verbose output
pnpm test -- --verbose

# Check for open handles
pnpm test -- --detectOpenHandles

# Run tests serially (not in parallel)
pnpm test -- --runInBand

# Update snapshots if needed
pnpm test -- --updateSnapshot
```

### Issue: E2E/Playwright tests failing

**Symptoms:**
- Timeout errors
- Element not found
- Navigation failures

**Solutions:**

```bash
# Install Playwright browsers
npx playwright install

# Run with debug mode
PWDEBUG=1 pnpm e2e

# Run headed (see browser)
pnpm e2e -- --headed

# Increase timeout
pnpm e2e -- --timeout=60000

# Run specific test
pnpm e2e -- tests/e2e/specific.spec.ts

# Generate test code
npx playwright codegen http://localhost:3000
```

### Issue: Smoke tests failing

**Symptoms:**
- \`make smoke\` fails
- Golden path validation errors
- Service health checks fail

**Solutions:**

```bash
# Ensure all services are running
make up
./scripts/wait-for-stack.sh

# Check service health
curl http://localhost:4000/health

# Run simple smoke test first
node scripts/smoke-test-simple.js

# Check logs for errors
make logs

# Reset demo data
make seed  # If available

# Run smoke test with debug output
DEBUG=* pnpm smoke
```

---

## Network & Port Issues

### Issue: Port already in use

**Symptoms:**
- \`EADDRINUSE\` errors
- Cannot bind to port
- Services fail to start

**Solutions:**

```bash
# Find what's using the port
lsof -i :PORT_NUMBER

# macOS/Linux: Kill process on port
kill -9 $(lsof -ti:PORT_NUMBER)

# Or use different ports in .env
# Edit .env and change PORT variables

# Example:
# SERVER_PORT=4001
# CLIENT_PORT=3001
```

### Issue: Cannot access services from browser

**Symptoms:**
- Browser shows connection refused
- Services running but not accessible
- CORS errors

**Solutions:**

```bash
# Check services are actually running
docker compose ps

# Check port mappings
docker compose -f docker-compose.dev.yml ps

# Verify correct URLs
echo "Frontend: http://localhost:3000"
echo "API: http://localhost:4000"
echo "GraphQL Playground: http://localhost:4000/graphql"

# Check firewall (macOS)
# System Preferences → Security & Privacy → Firewall

# Check firewall (Linux)
sudo ufw status
sudo ufw allow 3000/tcp
sudo ufw allow 4000/tcp

# Try accessing via 127.0.0.1 instead of localhost
open http://127.0.0.1:3000
```

---

## Performance Issues

### Issue: Slow build times

**Symptoms:**
- Builds take > 5 minutes
- Excessive CPU usage
- Compilation very slow

**Solutions:**

```bash
# Use Turbo cache
turbo run build --cache-dir=.turbo

# Build only changed packages
turbo run build --filter=...HEAD

# Enable SWC for Jest (check jest.config)
# transform: { '^.+\\.(t|j)sx?$': '@swc/jest' }

# Use faster TypeScript compiler
# Install: pnpm add -D @swc/core

# Reduce parallel workers
turbo run build --concurrency=2

# Check for large dependencies
npx npkill  # Find large node_modules
```

### Issue: Slow test execution

**Symptoms:**
- Tests take > 5 minutes
- High memory usage during tests
- Timeouts

**Solutions:**

```bash
# Reduce workers
pnpm test -- --maxWorkers=50%

# Run tests in band
pnpm test -- --runInBand

# Use test.only for debugging (remove before commit)
# test.only('my test', () => { ... })

# Skip slow tests temporarily
# test.skip('slow test', () => { ... })

# Profile tests
pnpm test -- --verbose --coverage
```

---

## Git & Version Control

### Issue: Pre-commit hooks blocking commit

**Symptoms:**
- Commit rejected
- Linting errors
- Type errors
- Secret scanning failures

**Solutions:**

```bash
# Fix linting errors
pnpm lint

# Fix type errors
pnpm typecheck

# Check for secrets
gitleaks detect --source . --verbose

# If false positive, add to .gitleaksignore
echo "path/to/file:rule-id" >> .gitleaksignore

# TEMPORARY BYPASS (NOT RECOMMENDED)
# git commit --no-verify

# Update pre-commit dependencies
pnpm install
```

### Issue: Merge conflicts

**Symptoms:**
- Cannot merge branch
- Conflicts in lock files
- Conflicts in generated files

**Solutions:**

```bash
# For pnpm-lock.yaml conflicts
git checkout --theirs pnpm-lock.yaml
pnpm install

# For generated files (like GraphQL types)
git checkout --theirs path/to/generated/file
pnpm graphql:codegen

# Resolve manually and regenerate
git checkout main
git pull origin main
git checkout your-branch
git merge main
# Fix conflicts
pnpm install
pnpm build
git add .
git commit
```

---

## Environment & Configuration

### Issue: \`.env\` file issues

**Symptoms:**
- Environment variables not loading
- Wrong values being used
- Missing variables

**Solutions:**

```bash
# Copy from example
cp .env.example .env

# Verify variables loaded
node -e "require('dotenv').config(); console.log(process.env.NODE_ENV)"

# Check for duplicates
sort .env | uniq -d

# Validate .env format (no spaces around =)
# Correct:   KEY=value
# Incorrect: KEY = value

# Source .env in shell (for debugging)
export $(cat .env | xargs)
```

### Issue: Different behavior in production

**Symptoms:**
- Works in dev, fails in prod
- Environment-specific errors
- Missing production variables

**Solutions:**

```bash
# Run production config check
pnpm ci:prod-guard

# Test with production environment locally
NODE_ENV=production pnpm start

# Verify production secrets are set
# Check .env.production.sample for required vars

# Compare environments
diff .env .env.production.sample
```

---

## Getting Help

### Self-Service Resources

1. **Documentation**: Check \`docs/\` directory
   - \`ARCHITECTURE.md\` - System design
   - \`DEVELOPER_ONBOARDING.md\` - Setup guide
   - \`CLAUDE.md\` - Complete reference
2. **Scripts**: Use helper scripts
   - \`scripts/health-check.sh\` - Check services
   - \`scripts/wait-for-stack.sh\` - Wait for services
   - \`scripts/cleanup-repository.sh\` - Clean state
3. **Logs**: Always check logs first
   - \`make logs\` - All services
   - \`docker compose logs service-name\` - Specific service
   - \`docker logs container-id --tail 100\` - Last 100 lines

### Escalation Path

1. **Level 1**: Self-service troubleshooting
   - Check this guide
   - Check logs
   - Search GitHub issues

2. **Level 2**: Team channels
   - Post in #engineering Slack/Teams
   - Include error messages and logs
   - Mention attempted solutions

3. **Level 3**: Create GitHub issue
   - Use issue template
   - Include reproduction steps
   - Attach relevant logs
   - Tag as \`bug\` or \`help-wanted\`

### Creating a Good Bug Report

Include:

\`\`\`markdown
## Description
Brief description of the issue

## Steps to Reproduce
1. Run \`make up\`
2. Execute \`make smoke\`
3. See error

## Expected Behavior
Tests should pass

## Actual Behavior
Error: Connection refused to Neo4j

## Environment
- OS: macOS 13.5
- Docker: 24.0.5
- Node: 18.18.0
- pnpm: 9.12.3

## Logs
\`\`\`
[paste relevant logs]
\`\`\`

## Attempted Solutions
- Tried restarting Docker
- Tried \`make down && make up\`
- Checked port 7474 is not in use
\`\`\`

---

## Quick Reference Commands

\`\`\`bash
# Health & Status
make health                           # Check service health
docker compose ps                     # List services
curl http://localhost:4000/health     # API health

# Logs & Debugging
make logs                            # All logs
docker compose logs -f service-name  # Follow specific service
docker exec -it container-name sh    # Shell into container

# Clean & Reset
make down                            # Stop services
docker system prune -af --volumes    # Nuclear option
make clean && make up                # Fresh start

# Testing
make smoke                          # Golden path test
pnpm test                           # Unit tests
pnpm e2e                            # E2E tests

# Building
pnpm build                          # Build all
pnpm typecheck                      # Type check
pnpm lint                           # Lint code

# Database
pnpm db:pg:migrate                  # PostgreSQL migrations
pnpm db:neo4j:migrate               # Neo4j migrations
make seed                           # Seed demo data
\`\`\`

---

## Common Error Messages

### \`Error: Cannot find module\`
→ Run \`pnpm install\`

### \`ECONNREFUSED\`
→ Service not running, check \`docker compose ps\`

### \`Port already in use\`
→ Kill process on port or change port in \`.env\`

### \`JavaScript heap out of memory\`
→ Increase Node memory: \`export NODE_OPTIONS="--max-old-space-size=8192"\`

### \`permission denied\`
→ Check file permissions: \`chmod +x script.sh\`

### \`docker daemon not running\`
→ Start Docker Desktop or \`sudo systemctl start docker\`

### \`gitleaks detected secrets\`
→ Remove secrets or add to \`.gitleaksignore\`

### \`CI checks failing\`
→ Run \`pnpm ci\` locally to reproduce

---

**Remember**: Most issues can be resolved with \`make down && make up\` or clearing caches. When in doubt, check the logs first!

For more help, see:
- [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
- [Architecture](./ARCHITECTURE.md)
- [CLAUDE.md](../CLAUDE.md)
