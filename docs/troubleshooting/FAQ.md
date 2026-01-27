# Summit Troubleshooting FAQ

> Quick solutions to common development issues. For detailed runbooks, see [/docs/runbooks](/docs/runbooks/).

## Table of Contents

- [Environment Setup](#environment-setup)
- [Build Issues](#build-issues)
- [Test Failures](#test-failures)
- [Database Issues](#database-issues)
- [Docker Issues](#docker-issues)
- [CI/CD Issues](#cicd-issues)
- [Performance Issues](#performance-issues)
- [Authentication Issues](#authentication-issues)

---

## Environment Setup

### ERR-001: Node.js version mismatch

**Symptom:**
```
error: The engine "node" is incompatible with this module
```

**Solution:**
```bash
# Check expected version
cat .nvmrc
# Output: 20.19.0

# Switch to correct version
nvm install 20.19.0
nvm use 20.19.0

# Or with volta
volta pin node@20.19.0
```

**Root Cause:** The repository requires Node.js 20.19.0 for compatibility with all dependencies.

---

### ERR-002: pnpm not found or wrong version

**Symptom:**
```
command not found: pnpm
# or
ERR_PNPM_UNSUPPORTED_ENGINE
```

**Solution:**
```bash
# Enable corepack (recommended)
corepack enable
corepack prepare pnpm@10.0.0 --activate

# Or install directly
npm install -g pnpm@10.0.0

# Verify
pnpm -v
# Output: 10.0.0
```

---

### ERR-003: Missing dependencies after clone

**Symptom:**
```
Cannot find module 'xyz'
# or
Error: Cannot resolve dependency
```

**Solution:**
```bash
# Clean install with frozen lockfile
pnpm install --frozen-lockfile

# If that fails, try clearing cache
pnpm store prune
rm -rf node_modules
pnpm install
```

---

### ERR-004: Bootstrap script fails

**Symptom:**
```
bootstrap.sh: Permission denied
# or
scripts/bootstrap.sh failed with exit code 1
```

**Solution:**
```bash
# Make scripts executable
chmod +x scripts/*.sh
chmod +x scripts/**/*.sh

# Run bootstrap
./scripts/bootstrap.sh

# Alternative: run steps manually
pnpm install --frozen-lockfile
pnpm build
```

---

## Build Issues

### ERR-010: TypeScript compilation errors

**Symptom:**
```
error TS2307: Cannot find module '@summit/xyz'
# or
error TS2345: Argument of type 'X' is not assignable
```

**Solution:**
```bash
# Rebuild TypeScript references
pnpm typecheck

# If path issues, rebuild project references
tsc -b --clean
tsc -b

# Check tsconfig.json paths
cat tsconfig.json | grep "paths" -A 10
```

---

### ERR-011: Build takes too long (>5 minutes)

**Symptom:** Build hangs or takes excessive time.

**Solution:**
```bash
# Use Turbo cache
pnpm turbo build --cache-dir=.turbo

# Clear stale cache if corrupted
rm -rf .turbo node_modules/.cache

# Check for circular dependencies
pnpm ls --depth=1 | grep -i circular
```

---

### ERR-012: Out of memory during build

**Symptom:**
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Then run build
pnpm build

# For CI, add to workflow:
# env:
#   NODE_OPTIONS: --max-old-space-size=8192
```

---

## Test Failures

### ERR-020: Jest tests fail with ES module errors

**Symptom:**
```
SyntaxError: Cannot use import statement outside a module
# or
ReferenceError: exports is not defined
```

**Solution:**
```bash
# Ensure jest.config.cjs is using correct preset
# Check that tsconfig has "module": "commonjs" for tests

# Run with experimental modules
NODE_OPTIONS="--experimental-vm-modules" pnpm test
```

---

### ERR-021: Flaky tests in CI

**Symptom:** Tests pass locally but fail intermittently in CI.

**Solution:**
```bash
# Check for timing-dependent tests
# Add explicit waits or use test retries

# In jest.config.cjs, add:
# retries: 2

# For Playwright:
# retries: process.env.CI ? 2 : 0
```

---

### ERR-022: Test database connection refused

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5434
```

**Solution:**
```bash
# Start test database
docker-compose -f docker-compose.dev.yaml up -d postgres

# Wait for it to be ready
./scripts/wait-for-it.sh localhost:5434 --timeout=30

# Check if running
docker ps | grep postgres
```

---

## Database Issues

### ERR-030: PostgreSQL connection failed

**Symptom:**
```
Error: Connection refused to localhost:5434
# or
FATAL: password authentication failed
```

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start if not running
make dev-up

# Check connection string
echo $DATABASE_URL

# Reset database
docker-compose down -v
docker-compose up -d postgres
pnpm db:migrate
```

---

### ERR-031: Neo4j connection failed

**Symptom:**
```
ServiceUnavailable: Could not connect to Neo4j
# or
Neo4jError: Authentication failed
```

**Solution:**
```bash
# Check if Neo4j is running
curl http://localhost:7474

# Start Neo4j
docker-compose up -d neo4j

# Default credentials (local dev)
# NEO4J_URI=bolt://localhost:7687
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=password

# Reset Neo4j data
docker-compose down neo4j
docker volume rm summit_neo4j_data
docker-compose up -d neo4j
```

---

### ERR-032: Migration failures

**Symptom:**
```
Migration "xyz" failed
# or
relation "table_name" already exists
```

**Solution:**
```bash
# Check migration status
pnpm db:pg:status

# Rollback last migration
pnpm db:knex:rollback

# Reset and re-run all migrations
pnpm db:reset

# If stuck, manually fix:
# 1. Connect to database
# 2. Check migration table
# 3. Remove failed migration entry
```

---

## Docker Issues

### ERR-040: Docker daemon not running

**Symptom:**
```
Cannot connect to the Docker daemon
# or
docker: command not found
```

**Solution:**
```bash
# macOS: Start Docker Desktop from Applications

# Linux:
sudo systemctl start docker
sudo systemctl enable docker

# Verify
docker info
```

---

### ERR-041: Port already in use

**Symptom:**
```
Error: bind: address already in use
# or
port 3000 is already allocated
```

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 pnpm dev
```

---

### ERR-042: Docker build fails with no space

**Symptom:**
```
no space left on device
# or
Error: write /var/lib/docker/...: no space left
```

**Solution:**
```bash
# Clean up Docker resources
docker system prune -a --volumes

# Check disk space
df -h

# Remove old images
docker image prune -a
```

---

## CI/CD Issues

### ERR-050: CI workflow fails on fork PRs

**Symptom:** PRs from forks fail with permission errors.

**Solution:**
The `ci.yml` workflow runs with limited permissions for fork PRs. This is expected behavior for security.

For maintainers:
```bash
# Fetch the PR branch locally
gh pr checkout <PR_NUMBER>

# Push to a branch with full CI access
git push origin HEAD:ci-test-<PR_NUMBER>
```

---

### ERR-051: Coverage gate fails

**Symptom:**
```
Coverage threshold not met: branches 75% < 80%
```

**Solution:**
```bash
# Check current coverage
pnpm coverage:collect

# View coverage report
open coverage/lcov-report/index.html

# Add tests to increase coverage
# Focus on uncovered branches and functions
```

---

### ERR-052: Pre-commit hook fails

**Symptom:**
```
husky - pre-commit hook exited with code 1
```

**Solution:**
```bash
# Run lint manually to see errors
pnpm lint

# Auto-fix what's possible
pnpm format
pnpm lint --fix

# If secrets detected by gitleaks
# Review the file and remove/mask sensitive data
```

---

## Performance Issues

### ERR-060: Slow development server startup

**Symptom:** `pnpm dev` takes >60 seconds to start.

**Solution:**
```bash
# Use minimal docker-compose preset
docker-compose -f docker-compose.dev.yaml --profile minimal up

# Or skip services you don't need
SKIP_NEO4J=true pnpm dev
```

---

### ERR-061: High memory usage

**Symptom:** System becomes slow during development.

**Solution:**
```bash
# Check memory usage
./scripts/dev-health.sh --verbose

# Limit Docker memory
# In Docker Desktop: Settings > Resources > Memory: 4GB

# Reduce parallel processes
TURBO_CONCURRENCY=2 pnpm build
```

---

## Authentication Issues

### ERR-070: JWT token invalid

**Symptom:**
```
JsonWebTokenError: invalid signature
# or
TokenExpiredError: jwt expired
```

**Solution:**
```bash
# Check JWT_SECRET is set
echo $JWT_SECRET

# Ensure consistent secret across services
# In .env:
# JWT_SECRET=your-development-secret-key

# For production, use secrets management
```

---

### ERR-071: OAuth callback URL mismatch

**Symptom:**
```
redirect_uri_mismatch
```

**Solution:**
```bash
# Check OAuth config matches your dev URL
# In .env:
# OAUTH_CALLBACK_URL=http://localhost:3000/auth/callback

# Ensure provider (Google, GitHub) has correct callback registered
```

---

## Quick Diagnostics

Run the health check script for quick diagnostics:

```bash
./scripts/dev-health.sh --verbose
```

This will check:
- Version compatibility
- Service connectivity
- Git status
- Dependencies
- Environment configuration

---

## Still Stuck?

1. **Search existing issues:** [GitHub Issues](https://github.com/BrianCLong/summit/issues)
2. **Check the runbooks:** [/docs/runbooks](/docs/runbooks/)
3. **Review recent changes:** `git log --oneline -20`
4. **Create a new issue** with:
   - Error message (full stack trace)
   - Steps to reproduce
   - Environment details (`./scripts/dev-health.sh` output)

---

*Last updated: 2026-01-27*
