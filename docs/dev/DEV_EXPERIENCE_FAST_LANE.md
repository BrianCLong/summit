# Developer Experience Fast Lane

> **TL;DR**: Get productive in 5 minutes with canonical commands that Just Work™.

This guide defines the **one true way** to run common development tasks. When in doubt, use these commands.

---

## 🚀 Quick Start (The Golden Path)

```bash
# 1. Bootstrap (first time only)
make bootstrap

# 2. Start services
make up

# 3. Verify everything works
make smoke

# You're ready to develop!
```

---

## 📋 Canonical Commands

These are the **authoritative** commands. If you see other variations, prefer these.

### Environment Management

| Task               | Command          | Notes                                          |
| ------------------ | ---------------- | ---------------------------------------------- |
| **Bootstrap**      | `make bootstrap` | Install deps, create `.env`, set up venv       |
| **Start services** | `make up`        | Start Docker dev stack                         |
| **Start with AI**  | `make up-ai`     | Start with AI/ML services (requires 12GB+ RAM) |
| **Stop services**  | `make down`      | Stop all containers                            |
| **Check health**   | `make health`    | Verify services are running                    |

### Code Quality

| Task           | Command          | Notes                        |
| -------------- | ---------------- | ---------------------------- |
| **Lint**       | `make lint`      | ESLint + Prettier check      |
| **Type check** | `make typecheck` | TypeScript compilation check |
| **Format**     | `make format`    | Auto-fix formatting          |
| **All checks** | `make check`     | lint + typecheck (fast)      |

### Testing

| Task            | Command           | Notes                                     |
| --------------- | ----------------- | ----------------------------------------- |
| **Unit tests**  | `make test`       | Run Jest tests across workspace           |
| **Smoke test**  | `make smoke`      | Validate golden path (requires `make up`) |
| **Quick tests** | `make test-quick` | Fast subset for pre-commit                |
| **E2E tests**   | `make e2e`        | Playwright browser tests                  |

### CI-Like Local Checks

| Task        | Command        | Notes                                 |
| ----------- | -------------- | ------------------------------------- |
| **CI fast** | `make ci-fast` | lint + typecheck + quick tests (~30s) |
| **CI full** | `make ci`      | Full CI suite locally (~2-5 min)      |

### Build

| Task          | Command      | Notes                             |
| ------------- | ------------ | --------------------------------- |
| **Build all** | `make build` | Build all packages (Turbo cached) |
| **Clean**     | `make clean` | Remove build artifacts and caches |

---

## 🔄 Common Workflows

### Starting Fresh (First Day)

```bash
# Clone and bootstrap
git clone https://github.com/BrianCLong/summit.git
cd summit
make bootstrap

# Start the dev stack
make up

# Validate everything works
make smoke

# Open in browser
open http://localhost:3000      # Client
open http://localhost:4000      # API (GraphQL Playground)
```

### Daily Development

```bash
# Start your day
make up                          # Start services if not running
make health                      # Verify healthy

# Before committing (automatic via pre-commit, but you can run manually)
make check                       # Lint + typecheck

# Before pushing
make ci-fast                     # Quick CI validation
```

### Before Creating a PR

```bash
# Run the full CI suite locally
make ci

# Or at minimum:
make lint && make typecheck && make test && make smoke
```

### Fixing Broken State

```bash
# Nuclear option: reset everything
make down
docker system prune -af          # Clean Docker
rm -rf node_modules .turbo       # Clean Node
make bootstrap                   # Reinstall
make up                          # Start fresh
make smoke                       # Verify
```

---

## ⚡ Pre-commit Hooks

Pre-commit hooks run automatically and are designed to be **fast** (< 5 seconds).

### What Runs on Commit

1. **gitleaks** - Secret scanning (fast, staged files only)
2. **lint-staged** - ESLint + Prettier on staged files
3. **commitlint** - Conventional commit message validation

### What Does NOT Run on Commit

- Full test suite (too slow)
- Type checking (too slow for large changes)
- Screenshot generation (moved to CI)

### Bypassing Hooks (Emergency Only)

```bash
# Skip pre-commit hooks (use sparingly!)
git commit --no-verify -m "fix: emergency hotfix"
```

---

## 🗺️ Command Mapping

If you find an old command, here's where it moved:

| Old Command           | New Canonical Command       |
| --------------------- | --------------------------- |
| `pnpm run lint`       | `make lint`                 |
| `pnpm run lint:check` | `make lint`                 |
| `pnpm run typecheck`  | `make typecheck`            |
| `npm run test:jest`   | `make test`                 |
| `pnpm test`           | `make test`                 |
| `pnpm run ci`         | `make ci`                   |
| `npm run test:quick`  | `make test-quick`           |
| `./start.sh`          | `make bootstrap && make up` |
| `make dev-setup`      | `make bootstrap`            |
| `make dev-run`        | `make up`                   |
| `make dev-test`       | `make smoke`                |

---

## 🔧 pnpm Equivalents

All `make` commands wrap pnpm. You can use either, but `make` is preferred for consistency:

```bash
# These are equivalent:
make lint           # Preferred
pnpm run lint       # Also works

make test           # Preferred
pnpm run test       # Also works

make typecheck      # Preferred
pnpm run typecheck  # Also works
```

---

## 📊 Service Endpoints

After `make up`, these services are available:

| Service           | URL                           | Credentials         |
| ----------------- | ----------------------------- | ------------------- |
| **Frontend**      | http://localhost:3000         | -                   |
| **GraphQL API**   | http://localhost:4000/graphql | -                   |
| **Neo4j Browser** | http://localhost:7474         | neo4j / devpassword |
| **Grafana**       | http://localhost:3001         | admin / admin       |
| **Prometheus**    | http://localhost:9090         | -                   |

---

## ❓ Troubleshooting

### "make up" fails

```bash
# Check Docker is running
docker info

# Check port conflicts
lsof -i :3000 -i :4000 -i :5432 -i :7474

# Reset and retry
make down
docker system prune -f
make up
```

### "make smoke" fails

```bash
# Check API health
curl http://localhost:4000/health/detailed | jq

# Check logs
docker-compose -f docker-compose.dev.yml logs api

# Restart services
make down && make up
```

### TypeScript errors

```bash
# Clear caches and rebuild
rm -rf .turbo node_modules/.cache
make typecheck
```

### ESLint errors

```bash
# Auto-fix what can be fixed
make format

# Then check again
make lint
```

---

## 🎯 Philosophy

1. **Fast feedback**: Pre-commit is < 5 seconds, `make ci-fast` is < 30 seconds
2. **Obvious commands**: `make lint`, `make test`, `make up` - no guessing
3. **One way to do things**: This doc is the source of truth
4. **CI parity**: `make ci` runs the same checks as GitHub Actions
5. **Fail fast**: Quick checks first, slow tests later

---

## 📚 Related Documentation

- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Full contribution guide
- [CLAUDE.md](../../CLAUDE.md) - AI assistant context
- [docs/ONBOARDING.md](../ONBOARDING.md) - Full onboarding guide
