# GA Red Playbook

> **When `make ga` fails, use this playbook to triage and fix.**

---

## Quick Triage Flowchart

```
make ga failed
    │
    ├─→ Which check failed?
    │
    ├─→ "Lint and Test" ──────────→ See: §1 Lint/Test Failures
    │
    ├─→ "Clean Environment" ──────→ See: §2 Environment Cleanup
    │
    ├─→ "Services Up" ────────────→ See: §3 Container Startup
    │
    ├─→ "Readiness Check" ────────→ See: §4 Service Readiness
    │
    ├─→ "Deep Health Check" ──────→ See: §5 Health Check Failures
    │
    ├─→ "Smoke Test" ─────────────→ See: §6 Smoke Test Failures
    │
    └─→ "Security Check" ─────────→ See: §7 Security Failures
```

---

## Decision: Fix-Forward vs Rollback

### Fix-Forward (Preferred)

Use when:

- Failure is in **your changes** (you broke it, you fix it)
- Fix is **small and obvious** (< 10 lines)
- No **production impact** yet (PR not merged)
- You can fix in **< 30 minutes**

### Rollback

Use when:

- Failure is in **main branch** (someone else broke it)
- Fix is **complex or risky**
- **Production is affected**
- You can't diagnose in **< 15 minutes**

**Rollback command:**

```bash
# Revert last commit on current branch
git revert HEAD --no-edit

# If on main and need to rollback deploy
make rollback v=<VERSION> env=<ENV>
```

---

## §1 Lint and Test Failures

**Symptoms:**

- `make ga` fails at "Lint and Test" check
- ESLint errors, TypeScript errors, or test failures

### Triage Steps

```bash
# 1. Identify the exact failure
pnpm lint 2>&1 | head -50
pnpm -C server typecheck 2>&1 | head -50
pnpm test 2>&1 | grep -A5 "FAIL"
```

### Common Fixes

| Error Pattern                           | Fix                                     |
| --------------------------------------- | --------------------------------------- |
| `ESLint: Parsing error`                 | Syntax error - check the file indicated |
| `ESLint: 'x' is defined but never used` | Remove unused import or `pnpm lint:fix` |
| `TS2304: Cannot find name`              | Missing import or typo                  |
| `TS2322: Type 'X' is not assignable`    | Fix the type annotation                 |
| `Jest: expect(X).toBe(Y)`               | Update test expectation or fix code     |
| `Jest: Cannot find module`              | Missing dependency or wrong import path |

### Auto-Fix Commands

```bash
# Fix most lint issues
pnpm lint:fix

# Update snapshots (if intentional changes)
pnpm test -- -u

# Fix specific package
pnpm -C <package> lint:fix
pnpm -C <package> test -- -u
```

---

## §2 Environment Cleanup Failures

**Symptoms:**

- `make ga` fails at "Clean Environment" check
- Docker containers won't stop
- Port conflicts

### Triage Steps

```bash
# 1. Check what's running
docker ps -a
lsof -i :3000   # UI port
lsof -i :4000   # API port
lsof -i :8080   # Gateway port

# 2. Force cleanup
docker compose down -v --remove-orphans
docker system prune -f
```

### Common Fixes

| Error Pattern               | Fix                                                      |
| --------------------------- | -------------------------------------------------------- |
| `port is already allocated` | Kill process using the port: `kill $(lsof -t -i:<PORT>)` |
| `container still running`   | `docker rm -f <container>`                               |
| `volume in use`             | `docker volume rm $(docker volume ls -q)`                |

### Nuclear Option

```bash
# Complete Docker reset (USE WITH CAUTION)
docker stop $(docker ps -aq) 2>/dev/null
docker rm $(docker ps -aq) 2>/dev/null
docker volume rm $(docker volume ls -q) 2>/dev/null
docker network prune -f
```

---

## §3 Container Startup Failures

**Symptoms:**

- `make ga` fails at "Services Up" check
- Docker containers exit immediately
- Build errors during `docker compose up`

### Triage Steps

```bash
# 1. Check container status
docker compose ps

# 2. Check logs for crashed containers
docker compose logs --tail=50 <service-name>

# 3. Check build output
docker compose build --no-cache <service-name>
```

### Common Fixes

| Error Pattern              | Fix                                                 |
| -------------------------- | --------------------------------------------------- |
| `ENOENT: no such file`     | Missing file in build context - check Dockerfile    |
| `npm ERR! code EINTEGRITY` | Clear npm cache: `npm cache clean --force`          |
| `OOMKilled`                | Increase Docker memory limit in Docker Desktop      |
| `exec format error`        | Architecture mismatch (ARM vs x86) - rebuild images |
| `connection refused`       | Dependency service not ready - check depends_on     |

### Rebuild Commands

```bash
# Rebuild specific service
docker compose build --no-cache <service>

# Rebuild all
docker compose build --no-cache

# Pull fresh base images
docker compose pull
```

---

## §4 Service Readiness Failures

**Symptoms:**

- `make ga` fails at "Readiness Check"
- Services start but never become ready
- Timeout waiting for health endpoint

### Triage Steps

```bash
# 1. Check if service is responding at all
curl -v http://localhost:8080/health

# 2. Check container logs
docker compose logs -f gateway

# 3. Check database connectivity
docker compose exec gateway nc -zv postgres 5432
docker compose exec gateway nc -zv redis 6379
```

### Common Fixes

| Error Pattern              | Fix                                                 |
| -------------------------- | --------------------------------------------------- |
| `ECONNREFUSED`             | Service crashed - check logs                        |
| `Connection timeout to DB` | Database not ready - increase wait or check DB logs |
| `Redis connection failed`  | Redis not started - check redis container           |
| `Migration pending`        | Run migrations: `make db-migrate`                   |

### Retry with More Wait Time

```bash
# Manually wait and retry
make up
sleep 60  # Wait longer
curl http://localhost:8080/health/ready
```

---

## §5 Health Check Failures

**Symptoms:**

- `make ga` fails at "Deep Health Check"
- Services running but unhealthy
- Dependency services failing

### Triage Steps

```bash
# 1. Check detailed health
curl -s http://localhost:8080/health/detailed | jq

# 2. Check individual services
curl http://localhost:4000/health   # API
curl http://localhost:3000          # UI
docker compose exec postgres pg_isready
docker compose exec redis redis-cli ping
```

### Common Fixes

| Error Pattern              | Fix                                              |
| -------------------------- | ------------------------------------------------ |
| `database: unhealthy`      | Check postgres logs, verify connection string    |
| `redis: unhealthy`         | Check redis logs, verify REDIS_URL               |
| `neo4j: unhealthy`         | Check neo4j logs, verify bolt connection         |
| `elasticsearch: unhealthy` | ES startup is slow - wait longer or check memory |

### Database Recovery

```bash
# Reset and reseed database
make down
docker volume rm summit_postgres_data 2>/dev/null
make up
make db-migrate
make db-seed
```

---

## §6 Smoke Test Failures

**Symptoms:**

- `make ga` fails at "Smoke Test"
- Services healthy but E2E flow broken
- UI or API not responding as expected

### Triage Steps

```bash
# 1. Check UI
curl -s http://localhost:3000 | head -20

# 2. Check API
curl -s http://localhost:4000/health

# 3. Check gateway routing
curl -s http://localhost:8080/api/health

# 4. Run smoke manually for details
make dev-smoke
```

### Common Fixes

| Error Pattern      | Fix                                |
| ------------------ | ---------------------------------- |
| `404 on UI`        | UI build failed or wrong path      |
| `CORS error`       | Check CORS config in server        |
| `401 Unauthorized` | Auth misconfiguration              |
| `502 Bad Gateway`  | Backend not reachable from gateway |

### Manual Smoke Verification

```bash
# Test each component
curl http://localhost:3000              # UI serves HTML
curl http://localhost:4000/health       # API responds
curl http://localhost:8080/healthz      # Gateway routes

# Test GraphQL
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

---

## §7 Security Failures

**Symptoms:**

- `make ga` fails at "Security Check"
- Secret scan found leaks
- SBOM generation failed

### Triage Steps

```bash
# 1. Run secret scan manually
gitleaks detect --verbose

# 2. Check what was flagged
cat artifacts/ga/gitleaks-report.json 2>/dev/null

# 3. Generate SBOM
make sbom
```

### Common Fixes

| Error Pattern             | Fix                                                 |
| ------------------------- | --------------------------------------------------- |
| `Secret detected in file` | Remove secret, add to .gitignore, rotate credential |
| `API key in source`       | Move to environment variable                        |
| `gitleaks not found`      | Install: `brew install gitleaks`                    |
| `SBOM generation failed`  | Install: `pnpm add -g @cyclonedx/cyclonedx-npm`     |

### Secret Remediation

```bash
# 1. Remove from git history (if committed)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch <path/to/secret>" \
  --prune-empty --tag-name-filter cat -- --all

# 2. Add to .gitignore
echo "path/to/secret" >> .gitignore

# 3. Rotate the credential in your secrets manager
```

---

## Quick Reference: GA Check Order

| #   | Check             | Command to Debug                      | Timeout |
| --- | ----------------- | ------------------------------------- | ------- |
| 1   | Lint and Test     | `make lint test`                      | 5min    |
| 2   | Clean Environment | `make down`                           | 1min    |
| 3   | Services Up       | `make up`                             | 3min    |
| 4   | Readiness Check   | `curl localhost:8080/health/ready`    | 60s     |
| 5   | Deep Health Check | `curl localhost:8080/health/detailed` | 10s     |
| 6   | Smoke Test        | `make smoke`                          | 2min    |
| 7   | Security Check    | `make sbom && gitleaks detect`        | 2min    |

---

## Escalation Path

If you can't fix within 30 minutes:

1. **Document the failure** - Copy error output
2. **Create an incident** - If affecting production
3. **Ask for help** - Tag team in Slack/Discord
4. **Rollback if needed** - Don't block deployments

### Incident Template

```markdown
## GA Gate Failure

**Check that failed:** <check name>
**Error message:**
```

<paste error>
```

**What I tried:**

1. <step 1>
2. <step 2>

**Environment:**

- Branch: <branch>
- Commit: <sha>
- Time: <timestamp>

```

---

## Prevention Checklist

Before running `make ga`:

- [ ] Ran `make claude-preflight` locally
- [ ] No uncommitted changes
- [ ] Docker Desktop running with enough memory (8GB+)
- [ ] No port conflicts (3000, 4000, 8080 free)
- [ ] On a clean branch (rebased from main recently)
```
