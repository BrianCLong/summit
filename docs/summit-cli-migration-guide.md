# Summit CLI Migration Guide

This guide helps teams migrate from ad-hoc scripts and multiple CLI tools to the unified Summit CLI.

## Why Migrate?

The Summit CLI consolidates:

- **300+ shell scripts** scattered across `scripts/`
- **25+ CLI binaries** in various packages
- **10+ Makefiles** with overlapping targets
- **6+ Justfiles** with recipe duplication
- **50+ npm scripts** in package.json

Into a **single, unified interface** with:

- ✅ Discoverable commands via `--help`
- ✅ Consistent argument patterns
- ✅ Machine-readable output (`--json`, `--ndjson`)
- ✅ Better error handling and diagnostics
- ✅ AI-agent friendly

## Migration Strategy

### Phase 1: Learn the New Commands (Week 1)

Team members should familiarize themselves with the new CLI:

```bash
# Install and explore
cd summit-cli && pnpm install && pnpm link --global
summit --help

# Try common operations
summit dev up
summit test smoke
summit doctor
```

**Action items:**

- [ ] All engineers install Summit CLI
- [ ] Read the Quickstart guide (`docs/summit-cli-quickstart.md`)
- [ ] Try the golden path workflow

### Phase 2: Parallel Adoption (Weeks 2-4)

During this phase, both old and new commands work:

```bash
# Old way (still works)
make up
npm run smoke

# New way (preferred)
summit dev up
summit test smoke
```

**Action items:**

- [ ] Update CI/CD to use Summit CLI
- [ ] Update documentation with new commands
- [ ] Add migration notes to existing scripts

### Phase 3: Full Migration (Week 5+)

Deprecate old patterns, enforce Summit CLI usage:

**Action items:**

- [ ] Add deprecation warnings to old scripts
- [ ] Update all documentation
- [ ] Team training on advanced features

## Command Migration Reference

### Development Commands

| Old Command              | New Command                         | Notes                            |
| ------------------------ | ----------------------------------- | -------------------------------- |
| `make up`                | `summit dev up`                     |                                  |
| `make up-ai`             | `summit dev up --profile ai`        |                                  |
| `make down`              | `summit dev down`                   |                                  |
| `just conductor-up`      | `summit dev up --profile conductor` |                                  |
| `just conductor-down`    | `summit dev down`                   |                                  |
| `just conductor-restart` | `summit dev restart`                |                                  |
| `just conductor-status`  | `summit dev status`                 |                                  |
| `just conductor-logs`    | `summit dev logs`                   |                                  |
| `just conductor-smoke`   | `summit test smoke`                 | Consolidated                     |
| `docker-compose up`      | `summit dev up`                     | Automatic compose file detection |
| `docker-compose logs -f` | `summit dev logs -f`                |                                  |

### Testing Commands

| Old Command                   | New Command                         | Notes                |
| ----------------------------- | ----------------------------------- | -------------------- |
| `npm run smoke`               | `summit test smoke`                 |                      |
| `npm run test:smoke:backend`  | `summit test smoke --backend-only`  |                      |
| `npm run test:smoke:frontend` | `summit test smoke --frontend-only` |                      |
| `npm run test:unit`           | `summit test unit`                  |                      |
| `npm run test:integration`    | `summit test integration`           |                      |
| `npm run test:e2e`            | `summit test e2e`                   |                      |
| `npm run test:policy`         | `summit test policy`                |                      |
| `./scripts/health-check.sh`   | `summit doctor`                     | Enhanced diagnostics |

### Database Commands

| Old Command                | New Command                           | Notes            |
| -------------------------- | ------------------------------------- | ---------------- |
| `npm run db:migrate`       | `summit db migrate`                   |                  |
| `npm run db:pg:migrate`    | `summit db migrate --target postgres` |                  |
| `npm run db:neo4j:migrate` | `summit db migrate --target neo4j`    |                  |
| `npm run db:seed`          | `summit db seed`                      |                  |
| `npm run seed:demo`        | `summit db seed --demo`               |                  |
| `npm run seed:demo:cet`    | `summit db seed --cet`                |                  |
| `npm run db:reset`         | `summit db reset --force`             | Requires --force |
| `npm run db:knex:rollback` | `summit db rollback`                  |                  |
| `npm run db:pg:status`     | `summit db status`                    |                  |
| `./scripts/backup.sh`      | `summit db backup`                    |                  |
| `./scripts/backup.sh --s3` | `summit db backup --s3`               |                  |

### Deployment Commands

| Old Command                        | New Command                               | Notes                 |
| ---------------------------------- | ----------------------------------------- | --------------------- |
| `npm run deploy:dev`               | `summit deploy dev`                       |                       |
| `npm run deploy:staging`           | `summit deploy staging`                   |                       |
| `npm run deploy:prod`              | `summit deploy prod --force`              | Requires --force      |
| `make stage`                       | `summit deploy staging`                   |                       |
| `make prod`                        | `summit deploy prod --force`              |                       |
| `./deploy/go-live-now.sh`          | `summit deploy prod --full-stack --force` | Full stack deployment |
| `./scripts/auto-rollback.sh <env>` | `summit deploy rollback <env>`            |                       |
| `./scripts/blue-green-deploy.sh`   | `summit deploy staging`                   | Blue-green built-in   |

### Verification Commands

| Old Command                           | New Command                         | Notes         |
| ------------------------------------- | ----------------------------------- | ------------- |
| `aer-verify <file>`                   | `summit verify audit <file>`        |               |
| `./scripts/audit-verify.sh`           | `summit verify audit`               | Comprehensive |
| `claim-verifier <file>`               | `summit verify claims <file>`       |               |
| `./scripts/ci/check-image-pinning.sh` | `summit verify images --check-pins` |               |
| `./scripts/test-policies.sh`          | `summit verify policy`              |               |
| `./scripts/slo_burn_check.py`         | `summit verify slo`                 |               |

### Pipeline Commands

| Old Command                            | New Command                                     | Notes          |
| -------------------------------------- | ----------------------------------------------- | -------------- |
| `maestro run <workflow>`               | `summit pipelines run <workflow>`               | Default engine |
| `maestro run <workflow> --engine argo` | `summit pipelines run <workflow> --engine argo` |                |
| `chronos-intent compile <file>`        | `summit pipelines validate <file>`              |                |
| N/A                                    | `summit pipelines list`                         | New feature    |
| N/A                                    | `summit pipelines status <id>`                  | New feature    |
| N/A                                    | `summit pipelines cancel <id>`                  | New feature    |

### Detection Rules

| Old Command                 | New Command                    | Notes       |
| --------------------------- | ------------------------------ | ----------- |
| `ig-detect validate <file>` | `summit rules validate <file>` |             |
| N/A                         | `summit rules test <file>`     | New feature |
| N/A                         | `summit rules list`            | New feature |
| N/A                         | `summit rules deploy`          | New feature |

### AI/Copilot

| Old Command                                    | New Command                         | Notes |
| ---------------------------------------------- | ----------------------------------- | ----- |
| `./scripts/ai-task-manager.py --task "<desc>"` | `summit copilot task "<desc>"`      |       |
| Call assistant server directly                 | `summit copilot retrieve "<query>"` |       |
| `./tools/rag_index.py`                         | `summit copilot index`              |       |

### Catalog

| Old Command | New Command                       | Notes       |
| ----------- | --------------------------------- | ----------- |
| N/A         | `summit catalog list`             | New feature |
| N/A         | `summit catalog inspect <id>`     | New feature |
| N/A         | `summit catalog search "<query>"` | New feature |
| N/A         | `summit catalog lineage <id>`     | New feature |
| N/A         | `summit catalog export`           | New feature |

## Updating CI/CD Pipelines

### GitHub Actions

**Before:**

```yaml
- name: Run tests
  run: |
    make up
    npm run smoke
    make down
```

**After:**

```yaml
- name: Run tests
  run: |
    summit dev up --ndjson
    summit test smoke --json
    summit dev down
```

### GitLab CI

**Before:**

```yaml
test:
  script:
    - make up
    - npm run test
    - make down
```

**After:**

```yaml
test:
  script:
    - summit dev up
    - summit test all --json
    - summit dev down
```

### Jenkins

**Before:**

```groovy
sh 'make up'
sh 'npm run smoke'
sh 'make down'
```

**After:**

```groovy
sh 'summit dev up --ndjson'
sh 'summit test smoke --json'
sh 'summit dev down'
```

## Updating Documentation

### README.md Updates

**Before:**

```markdown
## Getting Started

1. Install dependencies: `npm install`
2. Start services: `make up`
3. Run migrations: `npm run db:migrate`
4. Run tests: `npm run smoke`
```

**After:**

```markdown
## Getting Started

1. Initialize environment: `summit init`
2. Check health: `summit doctor`
3. Run tests: `summit test smoke`

See the [Summit CLI Quickstart](docs/summit-cli-quickstart.md) for details.
```

### Inline Code Comments

Update code comments that reference old commands:

```javascript
// Before:
// Run: npm run db:migrate

// After:
// Run: summit db migrate
```

## AI Agent Migration

### Before (Multiple Tools)

AI agents had to learn multiple command patterns:

```bash
# Different patterns, different outputs
docker-compose ps --format json
npm run smoke
./scripts/health-check.sh
aer-verify ledger.json
```

### After (Unified Interface)

AI agents use a single, consistent interface:

```bash
# Consistent pattern, consistent output
summit dev status --json
summit test smoke --json
summit doctor --json
summit verify audit --json
```

**Benefits for AI agents:**

- ✅ Single command pattern to learn
- ✅ Consistent `--json` output across all commands
- ✅ Discoverable via `--help`
- ✅ Streaming support with `--ndjson`

## Script Migration Examples

### Example 1: Deployment Script

**Before** (`scripts/deploy-staging.sh`):

```bash
#!/bin/bash
set -e

echo "Building images..."
docker-compose build

echo "Running migrations..."
npm run db:migrate

echo "Deploying to staging..."
make stage

echo "Running smoke tests..."
npm run smoke

echo "Done!"
```

**After** (`scripts/deploy-staging.sh`):

```bash
#!/bin/bash
set -e

# Use Summit CLI
summit deploy staging --ndjson | while read line; do
  echo $line | jq -r '.message // .status // .'
done

# Verify deployment
summit test smoke --json | jq -e '.success'

echo "Deployment complete!"
```

### Example 2: Health Check Script

**Before** (complex bash):

```bash
#!/bin/bash

check_postgres() {
  docker-compose exec -T postgres pg_isready
}

check_redis() {
  docker-compose exec -T redis redis-cli ping
}

# ... many more checks
```

**After** (single command):

```bash
#!/bin/bash

summit doctor --json | jq -e '.data.summary.failed == 0'
```

### Example 3: Pre-commit Hook

**Before:**

```bash
#!/bin/bash
npm run lint
npm run typecheck
npm run test:unit
```

**After:**

```bash
#!/bin/bash
summit test unit --quiet || exit 1
echo "All checks passed!"
```

## Rollback Plan

If you need to temporarily rollback to old commands:

1. **Old commands still work** - Nothing breaks during migration
2. **Documentation available** - Keep old docs in `docs/legacy/`
3. **Support period** - Old commands supported for 3 months

## Training Resources

- **Quickstart Guide**: `docs/summit-cli-quickstart.md`
- **README**: `summit-cli/README.md`
- **Design Doc**: `summit-cli/DESIGN.md`
- **Command Reference**: `summit --help` and subcommand helps

## Common Issues

### Issue: "Command not found: summit"

```bash
cd summit-cli
pnpm install
pnpm link --global
```

### Issue: "Old scripts don't work anymore"

Old scripts should still work! The Summit CLI is additive. If something broke, file an issue.

### Issue: "Output format changed"

Use `--json` or `--ndjson` for machine-readable output that won't change. Human-readable output may evolve.

### Issue: "Missing feature from old tool"

File an issue with:

- Old command you used
- Expected behavior
- Current Summit CLI equivalent (if any)

## Migration Checklist

Use this checklist to track your migration:

### Team Setup

- [ ] All engineers have Summit CLI installed
- [ ] Team has read the Quickstart guide
- [ ] Team has practiced common workflows

### Documentation

- [ ] README updated with Summit CLI commands
- [ ] Inline code comments updated
- [ ] Wiki/Confluence pages updated
- [ ] Onboarding docs updated

### CI/CD

- [ ] GitHub Actions updated
- [ ] GitLab CI updated
- [ ] Jenkins updated
- [ ] Pre-commit hooks updated
- [ ] Deployment scripts updated

### Scripts

- [ ] Deployment scripts migrated
- [ ] Test scripts migrated
- [ ] Health check scripts migrated
- [ ] Backup/restore scripts migrated

### Cleanup (After Transition Period)

- [ ] Deprecation warnings added to old scripts
- [ ] Old Makefiles archived
- [ ] Old Justfiles archived
- [ ] Old npm scripts marked deprecated
- [ ] Old documentation moved to `docs/legacy/`

## Support

- **Questions**: Team chat or issue tracker
- **Bugs**: File issue with `summit doctor --verbose` output
- **Feature requests**: File issue with use case

## Timeline

| Week | Phase       | Activities                              |
| ---- | ----------- | --------------------------------------- |
| 1    | Learning    | Install CLI, read docs, try commands    |
| 2-3  | Adoption    | Update CI/CD, start using in daily work |
| 4-5  | Migration   | Update all scripts and documentation    |
| 6-8  | Enforcement | Deprecate old commands, full adoption   |
| 9+   | Maintenance | Ongoing support and improvements        |

---

**Questions?** See `docs/summit-cli-quickstart.md` or run `summit --help`
