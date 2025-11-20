# Summit CLI Quickstart

Welcome to Summit! This guide will help you get started with the Summit CLI, whether you're a new engineer or an AI agent.

## What is Summit CLI?

Summit CLI is the unified command-line interface for the IntelGraph Summit platform. It consolidates hundreds of scripts, tools, and workflows into a single, intuitive interface that works great for both humans and AI agents.

**Key benefits:**

- **Discoverable**: Everything through `summit --help`
- **Consistent**: Uniform commands and output formats
- **Machine-readable**: JSON/NDJSON output for automation
- **Complete**: All platform operations in one place

## Installation

### Prerequisites

- Node.js >= 20
- pnpm (or npm)
- Docker & Docker Compose
- Git

### Install Summit CLI

```bash
# Clone the repository (if you haven't already)
git clone <repo-url>
cd summit

# Install dependencies and link CLI globally
cd summit-cli
pnpm install
pnpm link --global

# Verify installation
summit --version
```

## First Time Setup

### Interactive Setup (Recommended)

Run the interactive setup wizard:

```bash
summit init
```

This will guide you through:

1. Installing dependencies
2. Starting Docker services
3. Running database migrations
4. Optionally seeding demo data

### Automatic Setup

For scripts or automated setups:

```bash
summit init --auto
```

### Manual Setup

If you prefer to control each step:

```bash
# 1. Install dependencies
make bootstrap

# 2. Start Docker services
summit dev up

# 3. Run migrations
summit db migrate

# 4. (Optional) Seed demo data
summit db seed --demo
```

## Your First Tasks

### 1. Check System Health

```bash
summit doctor
```

This runs comprehensive diagnostics:

- Required tools (docker, pnpm, git, etc.)
- Node.js version
- Docker daemon status
- Service health
- Database connectivity
- Disk space

**Expected output:**

```
✓ All required tools are installed
✓ Node.js version: 20.11.0
✓ Docker daemon is running
✓ 5 services healthy
✓ PostgreSQL is ready
✓ Dependencies installed

Diagnostics complete: 8 passed, 0 failed, 0 warnings
All systems operational! 🚀
```

### 2. Start Development Stack

```bash
summit dev up
```

This will:

- Start all Docker Compose services (postgres, redis, neo4j, etc.)
- Wait for services to be healthy
- Run database migrations (if configured)
- Display service status

**Check what's running:**

```bash
summit dev status
```

**View logs:**

```bash
summit dev logs
summit dev logs -f postgres  # Follow postgres logs
```

### 3. Run Smoke Tests (Golden Path)

Verify everything works:

```bash
summit test smoke
```

This validates the "golden path" workflows:

- Create investigation
- Add entities and links
- Import data
- Run copilot queries
- WebSocket connectivity
- GraphQL API

**Expected result:**

```
✓ All golden path validations successful!
```

### 4. Make a Code Change

Let's say you edited some code. Build and test:

```bash
# Rebuild services
summit dev build

# Restart to pick up changes
summit dev restart

# Run tests
summit test unit
summit test integration

# Verify golden path still works
summit test smoke
```

### 5. Database Operations

**Run migrations:**

```bash
summit db migrate
```

**Check migration status:**

```bash
summit db status
```

**Seed demo data:**

```bash
summit db seed --demo
```

**Reset database (careful!):**

```bash
summit db reset --force
```

### 6. Deploy to Staging

When ready to deploy:

```bash
# Deploy with canary rollout
summit deploy staging

# Check deployment status
summit deploy status staging

# If issues, rollback
summit deploy rollback staging
```

## Common Workflows

### Daily Development Workflow

```bash
# Morning: Start fresh
summit dev up

# Check health
summit doctor

# Code, test, repeat
summit test unit --watch

# Pre-commit checks
summit test smoke
summit verify policy

# End of day
summit dev down
```

### Testing Workflow

```bash
# Run all tests
summit test all

# Or individually
summit test unit
summit test integration
summit test e2e
summit test smoke

# Run specific test
summit test unit src/services/AuthService.test.js

# Watch mode for TDD
summit test unit --watch
```

### Pipeline Workflow

```bash
# List available pipelines
summit pipelines list

# Validate pipeline definition
summit pipelines validate workflows/etl.yaml

# Run pipeline
summit pipelines run workflows/etl.yaml

# Check status
summit pipelines status <pipeline-id>

# Cancel if needed
summit pipelines cancel <pipeline-id>
```

### Verification Workflow

```bash
# Verify audit logs
summit verify audit

# Verify container images
summit verify images

# Verify policy compliance
summit verify policy

# Verify SLOs
summit verify slo --window 24h

# Run all verifications
summit verify audit && \
summit verify images && \
summit verify policy && \
summit verify slo
```

## AI Agent Usage

### Discovering Commands

As an AI agent, you can discover all available commands:

```bash
summit --help
summit dev --help
summit test --help
```

### Machine-Readable Output

Use `--json` for structured output:

```bash
# Get service status as JSON
summit dev status --json

# Example output:
{
  "command": "summit dev status",
  "success": true,
  "data": {
    "services": [
      {"name": "postgres", "status": "running", "health": "healthy"}
    ]
  }
}
```

Use `--ndjson` for streaming operations:

```bash
# Stream deployment progress
summit dev up --ndjson

# Example output (one JSON object per line):
{"type":"start","command":"dev up","timestamp":"2025-01-20T10:30:00Z"}
{"type":"progress","service":"postgres","status":"starting"}
{"type":"progress","service":"postgres","status":"healthy"}
{"type":"complete","success":true}
```

### AI Workflow Example

```bash
# 1. Check system health
HEALTH=$(summit doctor --json)
echo $HEALTH | jq '.data.checks[] | select(.status=="fail")'

# 2. If healthy, start dev stack
summit dev up --ndjson | while read line; do
  echo $line | jq '.type, .service, .status'
done

# 3. Run tests and verify
summit test smoke --json | jq '.success'

# 4. Query for information
summit copilot retrieve "deployment process" --json | jq '.results[].title'
```

## Configuration

### Create Project Config

Create `summit.config.js` in your project root:

```javascript
module.exports = {
  dev: {
    composeFile: './compose/docker-compose.yml',
    profiles: ['default'],
    autoMigrate: true,
    autoSeed: false,
  },

  pipelines: {
    defaultEngine: 'maestro',
    workflowDir: './workflows',
  },

  deploy: {
    defaultRegion: 'us-west-2',
    verifyImages: true,
  },

  test: {
    smokeTimeout: 120000,
  },
};
```

### User Config

Create `~/.summit/config.js` for user-specific settings:

```javascript
module.exports = {
  output: {
    color: true,
    emoji: false,
  },

  copilot: {
    model: 'claude-3-5-sonnet-20241022',
  },
};
```

## Troubleshooting

### Issue: "Command not found: summit"

**Solution:**

```bash
cd summit-cli
pnpm link --global
```

### Issue: "Docker daemon is not running"

**Solution:**

```bash
# On macOS
open -a Docker

# On Linux
sudo systemctl start docker

# Verify
docker info
```

### Issue: "No services running"

**Solution:**

```bash
summit dev up
summit dev status
```

### Issue: "Database connection failed"

**Solution:**

```bash
# Check PostgreSQL is running
summit dev status

# Check logs
summit dev logs postgres

# Restart if needed
summit dev restart postgres
```

### Issue: "Migrations failed"

**Solution:**

```bash
# Check migration status
summit db status

# Reset and try again (CAREFUL - deletes data)
summit db reset --force
```

### Run Full Diagnostics

When in doubt:

```bash
summit doctor --verbose
```

This will show detailed diagnostic information and suggest fixes.

## Advanced Usage

### Custom Profiles

Start with specific Docker Compose profiles:

```bash
# Start with AI services
summit dev up --profile ai

# Start with GPU support
summit dev up --profile gpu

# Multiple profiles
summit dev up --profile ai --profile observability
```

### Database Targets

Run migrations for specific databases:

```bash
# Postgres only
summit db migrate --target postgres

# Neo4j only
summit db migrate --target neo4j

# All databases (default)
summit db migrate --target all
```

### Quiet Mode

Minimal output for scripts:

```bash
summit test smoke --quiet
summit deploy staging --quiet --json
```

### Verbose Mode

Debug issues:

```bash
summit dev up --verbose
summit doctor --verbose
```

## Next Steps

Now that you're set up:

1. **Explore commands**: `summit --help`
2. **Read the design doc**: `summit-cli/DESIGN.md`
3. **Check the README**: `summit-cli/README.md`
4. **Run the golden path**: `summit test smoke`
5. **Deploy to staging**: `summit deploy staging`

## Getting Help

- **Command help**: `summit <command> --help`
- **System diagnostics**: `summit doctor`
- **AI assistance**: `summit copilot chat`
- **Documentation**: `docs/` directory
- **Issues**: Project issue tracker

## Feedback

The Summit CLI is designed to make your life easier. If you have suggestions or encounter issues:

1. Run `summit doctor --verbose` to gather diagnostics
2. Check the logs: `summit dev logs`
3. Report issues with detailed information

---

**Welcome to Summit! Happy coding!** 🚀
