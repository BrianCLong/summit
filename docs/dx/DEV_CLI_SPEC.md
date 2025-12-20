# Summit Dev CLI Specification

> **Version**: 1.0.0
> **Status**: Proposed
> **Purpose**: Unified CLI for all developer workflows

## Overview

The `summit` CLI provides a single, consistent interface for all developer operations. It replaces scattered Make targets, npm scripts, and shell scripts with discoverable, documented commands.

```
summit <command> [subcommand] [options]
```

## Design Principles

1. **Discoverable**: `summit help` shows all commands; `summit <cmd> --help` shows options
2. **Progressive**: Start simple, reveal complexity only when needed
3. **Fast Feedback**: Prefer streaming output; show progress for long operations
4. **Consistent**: Same option names across commands (e.g., `--profile`, `--verbose`)
5. **Safe Defaults**: Destructive operations require confirmation or `--force`

---

## Command Reference

### `summit doctor`

Validates development environment prerequisites.

```bash
summit doctor                 # Full check
summit doctor --quick         # Essential checks only
summit doctor --fix           # Attempt auto-fixes
```

**Checks:**
- Docker running and version >= 4.x
- Node.js >= 18.18
- pnpm >= 9.12.0
- Python >= 3.11
- Disk space >= 10GB
- Docker memory >= 8GB
- Required ports available (3000, 4000, 5432, 6379, 7474, 7687, 9200)

**Output Example:**
```
summit doctor

Checking development environment...

  Docker           24.0.6  [ok]
  Docker Memory    12 GB   [ok]
  Node.js          20.10.0 [ok]
  pnpm             9.12.0  [ok]
  Python           3.11.6  [ok]
  Disk Space       45 GB   [ok]
  Port 3000        free    [ok]
  Port 4000        free    [ok]
  Port 5432        free    [ok]
  ...

Environment ready!
```

---

### `summit bootstrap`

One-time setup for fresh clones.

```bash
summit bootstrap              # Full setup
summit bootstrap --skip-deps  # Skip dependency install
summit bootstrap --clean      # Remove existing .env, node_modules
```

**Steps:**
1. Run `summit doctor`
2. Create `.env` from `.env.example`
3. Install Node dependencies (`pnpm install`)
4. Setup Python venv (if requirements.txt exists)
5. Build dev tools
6. Print next steps

---

### `summit up`

Start development environment.

```bash
summit up                     # Core services
summit up --profile ai        # Include AI services
summit up --profile minimal   # Just databases
summit up --profile full      # Everything
summit up --detach            # Background mode (default)
summit up --attach            # Foreground with logs
summit up --build             # Force rebuild images
```

**Profiles:**
| Profile | Services |
|---------|----------|
| `minimal` | postgres, redis, neo4j |
| `core` (default) | minimal + api, web, gateway |
| `observability` | core + prometheus, grafana, jaeger, loki |
| `ai` | observability + kafka, ai-worker, copilot |
| `full` | Everything |

**Output Example:**
```
summit up

Starting Summit development stack...

  postgres     starting... [healthy]
  redis        starting... [healthy]
  neo4j        starting... [healthy]
  api          starting... [healthy]
  web          starting... [healthy]
  gateway      starting... [healthy]

All services healthy!

  Frontend:     http://localhost:3000
  API:          http://localhost:4000/graphql
  Neo4j:        http://localhost:7474
  Metrics:      http://localhost:4000/metrics

Run 'summit logs' to view logs
Run 'summit smoke' to validate golden path
```

---

### `summit down`

Stop development environment.

```bash
summit down                   # Stop all services
summit down --volumes         # Also remove volumes (data reset)
summit down --profile ai      # Only stop AI profile services
```

---

### `summit logs`

View service logs.

```bash
summit logs                   # All services
summit logs api               # Single service
summit logs api web           # Multiple services
summit logs --follow          # Stream logs (default)
summit logs --tail 100        # Last 100 lines
summit logs --since 5m        # Last 5 minutes
```

---

### `summit status`

Show environment status.

```bash
summit status                 # Service health
summit status --ports         # Show port mappings
summit status --resources     # CPU/memory usage
```

**Output Example:**
```
summit status

Service Status:
  postgres      healthy   5432:5432   42MB
  redis         healthy   6379:6379   8MB
  neo4j         healthy   7474,7687   256MB
  api           healthy   4000:4000   128MB
  web           healthy   3000:3000   64MB
  gateway       healthy   4100:4100   48MB

Total Memory: 546MB / 8GB allocated
```

---

### `summit smoke`

Run golden path validation.

```bash
summit smoke                  # Full smoke test
summit smoke --quick          # Health checks only
summit smoke --verbose        # Show all test output
summit smoke --bail           # Stop on first failure
```

---

### `summit test`

Run tests.

```bash
summit test                   # All tests
summit test --unit            # Unit tests only
summit test --integration     # Integration tests only
summit test --e2e             # End-to-end tests
summit test --coverage        # With coverage report
summit test --watch           # Watch mode
summit test --filter "api"    # Filter by package/path
```

---

### `summit lint`

Run linters.

```bash
summit lint                   # All linters
summit lint --fix             # Auto-fix issues
summit lint --ts              # TypeScript only
summit lint --py              # Python only
summit lint --staged          # Only staged files
```

---

### `summit build`

Build projects.

```bash
summit build                  # All packages
summit build --filter api     # Single package
summit build --docker         # Build Docker images
summit build --clean          # Clean before build
```

---

### `summit db`

Database operations.

```bash
summit db migrate             # Run all migrations
summit db migrate --rollback  # Rollback last migration
summit db seed                # Seed demo data
summit db reset               # Reset all databases (destructive!)
summit db shell postgres      # Open psql shell
summit db shell neo4j         # Open cypher-shell
summit db shell redis         # Open redis-cli
```

---

### `summit new`

Generate new components.

```bash
summit new service <name>     # New service (uses golden path template)
summit new package <name>     # New shared package
summit new component <name>   # New React component
summit new migration <name>   # New database migration

# Options for service
summit new service my-api --port 4050 --owner my-team
```

---

### `summit secrets`

Local secrets management.

```bash
summit secrets init           # Initialize local vault
summit secrets set KEY        # Set a secret (prompts for value)
summit secrets get KEY        # Get a secret
summit secrets list           # List secret keys (not values)
summit secrets sync           # Sync from team vault
```

---

### `summit pr`

Pull request helpers.

```bash
summit pr check               # Pre-PR validation (lint, test, smoke)
summit pr size                # Estimate PR size, warn if large
summit pr template            # Generate PR description from commits
```

---

### `summit clean`

Cleanup operations.

```bash
summit clean                  # Standard cleanup
summit clean --deep           # Include Docker, node_modules
summit clean --docker         # Docker artifacts only
summit clean --cache          # Build caches only
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SUMMIT_PROFILE` | `core` | Default docker profile |
| `SUMMIT_LOG_LEVEL` | `info` | CLI log verbosity |
| `SUMMIT_COLOR` | `auto` | Color output (auto/always/never) |
| `SUMMIT_TELEMETRY` | `off` | Usage telemetry |

### Config File

Optional `.summitrc.json` in project root:

```json
{
  "profile": "observability",
  "ports": {
    "api": 4000,
    "web": 3000
  },
  "doctor": {
    "skipChecks": ["python"]
  }
}
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Prerequisites not met |
| 4 | Service health check failed |
| 5 | Test failure |

---

## Implementation Notes

### Phase 1 (Core)
- `doctor`, `bootstrap`, `up`, `down`, `logs`, `status`, `smoke`

### Phase 2 (Developer Workflow)
- `test`, `lint`, `build`, `db`

### Phase 3 (Generation & Collaboration)
- `new`, `secrets`, `pr`, `clean`

---

## Comparison to Current State

| Current | New |
|---------|-----|
| `make bootstrap` | `summit bootstrap` |
| `make up` | `summit up` |
| `make up-ai` | `summit up --profile ai` |
| `make smoke` | `summit smoke` |
| `make down` | `summit down` |
| `pnpm test` | `summit test` |
| `pnpm lint` | `summit lint` |
| `docker-compose logs api` | `summit logs api` |
| `node companyos/scripts/companyos-cli.mjs new-service` | `summit new service` |

---

## Metrics

Track improvements via:
- **Time to first smoke**: Time from clone to passing `summit smoke`
- **Command success rate**: % of CLI invocations that succeed
- **Developer NPS**: Quarterly survey on tooling satisfaction
