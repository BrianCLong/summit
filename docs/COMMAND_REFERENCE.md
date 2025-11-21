# Summit Command Reference

This document provides the canonical commands for common development workflows. Use these commands consistently across local development, CI, and documentation.

## 📋 Quick Reference Table

| Task | Canonical Command | Aliases | Notes |
|------|-------------------|---------|-------|
| **Setup** |
| Install dependencies | `make bootstrap` | - | Run once after clone |
| Create .env file | `cp .env.example .env` | - | Required before `make up` |
| **Development** |
| Start services | `make up` | `./start.sh --skip-smoke` | Starts Docker stack |
| Start with AI | `make up-ai` | `./start.sh --ai --skip-smoke` | Requires 12GB+ RAM |
| Stop services | `make down` | - | Cleans up containers |
| **Validation** |
| Run smoke tests | `make smoke` | `pnpm smoke`, `npm run smoke` | Golden path validation |
| Type checking | `pnpm typecheck` | `npm run typecheck` | Validates TypeScript |
| Linting | `pnpm lint` | `npm run lint` | ESLint + Ruff |
| Unit tests | `pnpm test` | `npm test` | Jest/Vitest |
| **All-in-one** |
| Full setup | `./start.sh` | - | bootstrap + up + smoke |
| Full setup with AI | `./start.sh --ai` | - | bootstrap + up-ai + smoke |
| **Debugging** |
| View logs | `docker-compose logs api` | - | API server logs |
| Health check | `curl http://localhost:4000/health/detailed \| jq` | - | Detailed status |
| Container status | `docker-compose ps` | - | Shows all containers |
| **Help** |
| Show Makefile help | `make help` | `make` | List available commands |
| Script help | `./start.sh --help` | - | Bootstrap script options |

## 🎯 Common Workflows

### First-Time Setup

```bash
# 1. Clone and navigate
git clone https://github.com/BrianCLong/summit.git
cd summit

# 2. One-command setup (recommended)
./start.sh

# OR manual setup
make bootstrap  # Install dependencies
make up         # Start services
make smoke      # Validate golden path
```

### Daily Development

```bash
# Start your day
make up         # Start services
make smoke      # Validate everything works

# Make changes...

# Before committing
pnpm lint       # Check code quality
pnpm typecheck  # Verify types
pnpm test       # Run unit tests
make smoke      # Validate golden path still works

# End of day
make down       # Stop services
```

### Troubleshooting a Broken Stack

```bash
# 1. Check what's running
docker-compose ps

# 2. View logs for the failing service
docker-compose logs api

# 3. Check detailed health
curl http://localhost:4000/health/detailed | jq

# 4. Nuclear option: clean restart
make down
docker system prune -f  # Clean up dangling containers
make up
make smoke
```

### Running Tests in CI/Locally

```bash
# Locally (matches CI)
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
make smoke

# In CI (automated)
# See .github/workflows/ci.yml for canonical CI commands
```

## 🔄 Script Naming Conventions

### Canonical vs. Aliases

**Use canonical commands in:**
- Documentation
- CI workflows
- Makefiles
- Scripts that call other scripts

**Aliases are acceptable in:**
- Interactive terminal use
- Personal shortcuts
- Quick local iterations

### Why Consistency Matters

1. **Reduces confusion**: New developers know exactly which command to run
2. **Easier debugging**: Logs and error messages use the same command names
3. **Better searchability**: Documentation and Stack Overflow answers align
4. **CI/local parity**: What works locally works in CI

## 📝 Adding New Commands

When adding new commands:

1. **Choose ONE canonical name**
   - Prefer `make <target>` for infrastructure tasks
   - Prefer `pnpm <script>` for JavaScript/TypeScript tasks

2. **Document in this file**
   - Add to the Quick Reference table
   - Include example usage

3. **Update help text**
   - Add to `make help`
   - Add to script `--help` output

4. **Announce in PR**
   - Call out new commands in PR description
   - Update relevant runbooks/docs

## ❓ FAQ

**Q: Should I use `pnpm` or `npm`?**
A: Prefer `pnpm` everywhere. CI uses `pnpm`, and it's faster with better disk usage.

**Q: What's the difference between `make smoke` and `pnpm smoke`?**
A: `make smoke` checks that services are running first, then calls `pnpm smoke`. Use `make smoke` after `make up`, and `pnpm smoke` if services are already confirmed running.

**Q: When should I use `./start.sh` vs `make bootstrap && make up`?**
A: Use `./start.sh` for one-command convenience. Use separate commands if you need to debug a specific step or skip parts (e.g., `make up` without re-running bootstrap).

**Q: How do I know which commands are safe to run in parallel?**
A: Generally:
- ✅ Safe: `make down`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (when services are up)
- ❌ Not safe: `make up`, `make bootstrap`, `pnpm smoke` (requires exclusive access)

**Q: Can I create my own aliases?**
A: Yes! Add them to your shell config (`~/.bashrc`, `~/.zshrc`), not to the repo. Example:
```bash
alias summit-up="cd ~/summit && make up"
alias summit-smoke="cd ~/summit && make smoke"
```

## 🔗 Related Documentation

- [ONBOARDING.md](./ONBOARDING.md) - First-time setup guide
- [README.md](../README.md) - Project overview
- [RUNBOOK.md](../RUNBOOK.md) - Operational procedures
- [Makefile](../Makefile) - Authoritative source for `make` targets
- [package.json](../package.json) - Authoritative source for `pnpm` scripts
