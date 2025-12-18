# Developer Onboarding Checklist

> **Time to Productivity Target**: 30 minutes to first `summit smoke` pass
> **Time to First Contribution**: < 4 hours

## Pre-Arrival Checklist (IT/Manager)

- [ ] GitHub access granted to `BrianCLong/summit` repository
- [ ] Added to team Slack/communication channels
- [ ] Calendar invite for onboarding session
- [ ] Hardware meets requirements (see below)

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 16GB | 32GB |
| Disk | 50GB free | 100GB free SSD |
| CPU | 4 cores | 8+ cores |
| OS | macOS 12+, Ubuntu 22.04+, Windows 11 WSL2 | macOS (Apple Silicon) |

---

## Day 1: Environment Setup (30 minutes)

### Phase 1: Prerequisites (10 minutes)

Run each command and verify the output:

```bash
# 1. Docker Desktop installed and running
docker --version
# Expected: Docker version 24.x or higher
docker info | grep "Total Memory"
# Expected: Total Memory: 8GiB or higher

# 2. Node.js installed
node --version
# Expected: v18.18.0 or higher (v20+ recommended)

# 3. pnpm enabled
corepack enable
pnpm --version
# Expected: 9.12.0 or higher

# 4. Python installed (optional, for ML features)
python3 --version
# Expected: Python 3.11 or higher
```

**Checklist:**
- [ ] Docker Desktop running with 8GB+ memory allocated
- [ ] Node.js 18.18+ installed
- [ ] pnpm 9.12+ available
- [ ] Python 3.11+ installed (optional)

---

### Phase 2: Clone & Bootstrap (10 minutes)

```bash
# 1. Clone repository
git clone https://github.com/BrianCLong/summit.git
cd summit

# 2. Run bootstrap
make bootstrap
# Expected output ends with: "bootstrap: DONE ✓"

# 3. Verify .env created
ls -la .env
# Expected: .env file exists

# 4. Verify dependencies installed
ls node_modules | head -5
# Expected: Shows package directories
```

**Checklist:**
- [ ] Repository cloned successfully
- [ ] `make bootstrap` completed without errors
- [ ] `.env` file created
- [ ] `node_modules` populated

---

### Phase 3: Start Services (5 minutes)

```bash
# 1. Start development stack
make up
# Expected: Services start, ends with "Services ready! ✓"

# 2. Verify services running
docker ps --format "table {{.Names}}\t{{.Status}}"
# Expected: All containers show "Up" and "healthy"
```

**Checklist:**
- [ ] All containers started
- [ ] Health checks passing (green)

---

### Phase 4: Validate Golden Path (5 minutes)

```bash
# 1. Run smoke tests
make smoke
# Expected: "smoke: DONE ✓" and "Golden path validated successfully!"

# 2. Access services in browser
open http://localhost:3000    # Frontend
open http://localhost:4000/graphql  # API Playground
open http://localhost:7474    # Neo4j Browser (neo4j/devpassword)
```

**Checklist:**
- [ ] Smoke tests pass (100% success rate)
- [ ] Frontend loads at localhost:3000
- [ ] GraphQL Playground accessible at localhost:4000/graphql
- [ ] Neo4j Browser accessible at localhost:7474

---

## Day 1: Orientation (1-2 hours)

### Codebase Tour

Review these key locations:

| Path | Purpose | Priority |
|------|---------|----------|
| `CLAUDE.md` | AI assistant guide, conventions | ⭐⭐⭐ |
| `docs/ARCHITECTURE.md` | System design | ⭐⭐⭐ |
| `server/src/` | API implementation | ⭐⭐ |
| `client/src/` | React frontend | ⭐⭐ |
| `docker-compose.dev.yml` | Service definitions | ⭐⭐ |
| `scripts/smoke-test.js` | Golden path tests | ⭐ |

**Checklist:**
- [ ] Read CLAUDE.md (15 min)
- [ ] Skim ARCHITECTURE.md (10 min)
- [ ] Explore server/src structure (10 min)
- [ ] Explore client/src structure (10 min)

---

### First Code Change

Make a trivial change to verify your setup:

```bash
# 1. Create feature branch
git checkout -b onboarding/your-name-test

# 2. Make a small change (e.g., add comment to server/src/index.ts)
echo "// Onboarding test - $(date)" >> server/src/index.ts

# 3. Run tests
pnpm test:quick

# 4. Run linter
pnpm lint

# 5. Verify smoke still passes
make smoke

# 6. Revert change
git checkout server/src/index.ts
```

**Checklist:**
- [ ] Created branch successfully
- [ ] Tests pass
- [ ] Linter passes
- [ ] Smoke tests still pass

---

## Week 1: Deeper Learning

### Daily Commands Reference

```bash
# Start work
make up                    # Start services
make smoke                 # Verify environment

# During development
pnpm dev                   # Hot reload for all
pnpm test:watch            # Watch mode tests
docker-compose logs -f api # Follow API logs

# End of day
make down                  # Stop services (data preserved)
```

### Complete These Tasks

- [ ] **Task 1**: Run the golden path manually through the UI
  - Create investigation at localhost:3000
  - Add entities and relationships
  - Run Copilot analysis

- [ ] **Task 2**: Execute a GraphQL query in the playground
  ```graphql
  query {
    investigations {
      id
      name
      status
    }
  }
  ```

- [ ] **Task 3**: View traces in Jaeger
  - Start observability: `make up-ai` or add observability profile
  - Open http://localhost:16686
  - Find traces for API requests

- [ ] **Task 4**: Review a recent PR
  - Find a merged PR in GitHub
  - Review the changes, tests, and CI results

---

## First Contribution Checklist

Before submitting your first PR:

- [ ] Branch follows naming convention (`feature/xxx`, `fix/xxx`)
- [ ] Commits follow conventional commits format
- [ ] All tests pass locally: `pnpm test`
- [ ] Linter passes: `pnpm lint`
- [ ] Smoke tests pass: `make smoke`
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] PR description includes:
  - Summary of changes
  - Test plan
  - Screenshots (if UI change)

---

## Troubleshooting Quick Reference

### "Port already in use"
```bash
lsof -i :4000  # Find process
kill -9 <PID>  # Kill it
make up        # Restart
```

### "Container unhealthy"
```bash
docker-compose logs <service>  # Check logs
make down && make up           # Restart stack
```

### "Tests fail but worked before"
```bash
make down --volumes  # Reset databases
make up
make smoke
```

### "pnpm install fails"
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm store prune
pnpm install
```

### "Docker out of space"
```bash
docker system prune -af  # Remove unused data
docker volume prune -f   # Remove unused volumes
```

---

## Validation Summary

Run this final check to confirm everything works:

```bash
#!/bin/bash
# Save as verify-onboarding.sh

echo "🔍 Verifying onboarding setup..."

# Check prerequisites
docker --version > /dev/null 2>&1 && echo "✅ Docker" || echo "❌ Docker"
node --version > /dev/null 2>&1 && echo "✅ Node.js" || echo "❌ Node.js"
pnpm --version > /dev/null 2>&1 && echo "✅ pnpm" || echo "❌ pnpm"

# Check files
[ -f .env ] && echo "✅ .env exists" || echo "❌ .env missing"
[ -d node_modules ] && echo "✅ node_modules exists" || echo "❌ node_modules missing"

# Check services
curl -sf http://localhost:4000/health > /dev/null && echo "✅ API healthy" || echo "❌ API not responding"
curl -sf http://localhost:3000 > /dev/null && echo "✅ Frontend healthy" || echo "❌ Frontend not responding"

echo ""
echo "Run 'make smoke' for full validation"
```

**Expected Result**: All checks show ✅

---

## Getting Help

| Issue Type | Resource |
|------------|----------|
| Setup problems | This checklist, then ask in #dev-help |
| Code questions | CLAUDE.md, then team chat |
| Architecture | docs/ARCHITECTURE.md |
| Bug in platform | Create GitHub issue |

---

## Success Criteria

You're ready to contribute when:

✅ `make up && make smoke` passes
✅ You can navigate the codebase
✅ You understand the golden path (Investigation → Entities → Copilot → Results)
✅ You can run tests and linters
✅ You know where to find help

**Welcome to the team! 🎉**
