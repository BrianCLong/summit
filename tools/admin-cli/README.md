# Summit Admin CLI

> Unified Admin & SRE CLI for IntelGraph Platform Operations

[![Build Status](https://github.com/BrianCLong/summit/actions/workflows/admin-cli.yml/badge.svg)](https://github.com/BrianCLong/summit/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

The Summit Admin CLI (`summit-admin`) provides a powerful, unified command-line interface for administering and operating the IntelGraph platform. It is designed for SRE teams, platform administrators, and DevOps engineers who need controlled, audited access to platform operations.

### Key Features

- **Unified Interface**: Single CLI for all admin operations across the platform
- **Safety First**: Dry-run mode, typed confirmations, production safeguards
- **Full Auditability**: Every operation is logged to the audit black box
- **Machine-Parseable**: JSON output for scripting and automation
- **Profile Management**: Support for multiple environments (dev, staging, prod)
- **Runbook Integration**: Machine-executable playbooks for incident response

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configuration](#configuration)
- [Safety Features](#safety-features)
- [Scripting & Automation](#scripting--automation)
- [Architecture](#architecture)
- [Development](#development)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Installation

### From npm (Recommended)

```bash
npm install -g @summit/admin-cli
```

### From Source

```bash
cd tools/admin-cli
pnpm install
pnpm build
npm link
```

### Verify Installation

```bash
summit-admin --version
summit-admin --help
```

## Quick Start

### 1. Initialize Configuration

```bash
# Interactive setup wizard
summit-admin config init

# Or configure manually
summit-admin config profile default --endpoint http://localhost:4000 --interactive
```

### 2. Check Environment Status

```bash
# View environment health
summit-admin env status

# Check specific service
summit-admin env health --service api
```

### 3. Common Operations

```bash
# List tenants
summit-admin tenant list

# Check graph database stats
summit-admin graph stats --detailed

# Run security policy check
summit-admin security check-policies --all
```

## Commands

### Environment Commands (`env`)

Monitor platform health and status.

```bash
# Full environment status with SLO metrics
summit-admin env status --detailed

# Health check with wait for healthy
summit-admin env health --wait --timeout 120

# List all services
summit-admin env services --type api

# Show SLO summary for last 24 hours
summit-admin env slo --period day
```

### Tenant Commands (`tenant`)

Manage multi-tenant operations.

```bash
# List all tenants
summit-admin tenant list --status active

# Get tenant details
summit-admin tenant get <tenant-id>

# Create new tenant (interactive)
summit-admin tenant create --interactive

# Create tenant (non-interactive)
summit-admin tenant create --name "Acme Corp" --admin-email admin@acme.com --plan enterprise

# Suspend tenant (requires confirmation)
summit-admin tenant suspend <tenant-id> --reason "Payment overdue"

# Reactivate tenant
summit-admin tenant reactivate <tenant-id>

# Export tenant metadata
summit-admin tenant export-metadata <tenant-id> --output tenant-export.json --include-users --include-quotas

# Update tenant quotas
summit-admin tenant update-quotas <tenant-id> --max-users 500 --max-entities 5000000
```

### Data Commands (`data`)

Manage data operations and maintenance.

```bash
# Run backfill operation
summit-admin data backfill --source postgres --target neo4j --entity-type Person --batch-size 1000

# Reindex search engine
summit-admin data reindex --all --batch-size 500

# Verify data integrity
summit-admin data verify-integrity --source postgres --target neo4j --sample-size 10000

# Check operation status
summit-admin data status <operation-id> --watch

# Cancel running operation
summit-admin data cancel <operation-id>

# List recent operations
summit-admin data operations --status running --limit 20
```

### Security Commands (`security`)

Security operations and compliance.

```bash
# List security keys
summit-admin security keys --type jwt --status active

# Rotate security keys (dangerous - requires confirmation)
summit-admin security rotate-keys --type all --grace-period 24

# Check policy compliance
summit-admin security check-policies --all --fail-on-violation --report policy-report.json

# View audit events
summit-admin security audit --from 2024-01-01 --action auth.success --limit 1000

# Revoke user tokens
summit-admin security revoke-tokens --user <user-id>

# Check user permission
summit-admin security check-permission --user <user-id> --permission entity:delete
```

### Graph Commands (`graph`)

Neo4j graph database operations.

```bash
# Show graph statistics
summit-admin graph stats --detailed

# Check graph health
summit-admin graph health

# Execute read-only Cypher query
summit-admin graph query "MATCH (n:Entity) RETURN count(n) as count" --limit 100

# Show schema (labels, relationships, indexes)
summit-admin graph schema --indexes

# Clear query cache
summit-admin graph clear-cache

# Run database vacuum (requires confirmation)
summit-admin graph vacuum --analyze

# Export graph data
summit-admin graph export --format json --labels Entity,Person --output graph-export.json
```

### Configuration Commands (`config`)

Manage CLI configuration and profiles.

```bash
# Show current configuration
summit-admin config show

# Get specific config value
summit-admin config get profiles.production.endpoint

# Set config value
summit-admin config set defaultProfile production

# List all profiles
summit-admin config profiles

# Add/update profile
summit-admin config profile staging --endpoint https://api.staging.intelgraph.com --token $STAGING_TOKEN

# Use profile as default
summit-admin config use production

# Initialize configuration (wizard)
summit-admin config init

# Reset to defaults
summit-admin config reset --force

# Show config file path
summit-admin config path
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `INTELGRAPH_TOKEN` | Authentication token | - |
| `SUMMIT_ADMIN_TOKEN` | Alternative token variable | - |
| `SUMMIT_ADMIN_ENDPOINT` | Default API endpoint | `http://localhost:4000` |
| `SUMMIT_ADMIN_PROFILE` | Default profile name | `default` |
| `NO_COLOR` | Disable colored output | - |

### Configuration File

Located at `~/.config/summit-admin-cli/config.json`:

```json
{
  "defaultProfile": "production",
  "defaultEndpoint": "https://api.intelgraph.com",
  "profiles": {
    "default": {
      "endpoint": "http://localhost:4000",
      "defaultFormat": "table"
    },
    "production": {
      "endpoint": "https://api.intelgraph.com",
      "token": "***",
      "defaultFormat": "table"
    }
  }
}
```

### Profile Management

```bash
# Create production profile
summit-admin config profile production \
  --endpoint https://api.intelgraph.com \
  --interactive

# Switch profiles
summit-admin config use production

# Use profile for single command
summit-admin --profile production env status
```

## Safety Features

### Dry-Run Mode

Preview changes without executing:

```bash
summit-admin --dry-run tenant suspend acme-corp
# Output: Would suspend tenant: acme-corp
# No actual changes made
```

### Typed Confirmations

Destructive operations require typed confirmation:

```bash
summit-admin security rotate-keys --type all

# Output:
# WARNING: You are about to rotate ALL security keys...
# To confirm, type: "I understand this will rotate keys"
# Confirmation: _
```

### Production Safeguards

Extra confirmation for production environments:

```bash
summit-admin --profile production tenant suspend acme-corp

# Output:
# WARNING: You are about to suspend tenant in PRODUCTION environment.
# To confirm, type: "I understand this affects production"
```

### Interactive Requirements

Dangerous operations require interactive terminal:

```bash
# This will fail in non-interactive mode (e.g., cron)
summit-admin tenant suspend acme-corp

# Use --force to bypass (use with caution)
summit-admin tenant suspend acme-corp --force
```

## Scripting & Automation

### JSON Output

Use `--format json` for machine-parseable output:

```bash
# Get tenant list as JSON
summit-admin --format json tenant list | jq '.[] | .id'

# Check health and parse with jq
summit-admin --format json env health | jq '.services[] | select(.status != "healthy")'
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error |
| 3 | Authentication error |
| 4 | Permission denied |
| 5 | Resource not found |
| 10 | Policy violation (with --fail-on-violation) |

### Example Scripts

#### Health Check Script

```bash
#!/bin/bash
set -e

# Check all services are healthy
if ! summit-admin --format json env health | jq -e '.overallStatus == "healthy"' > /dev/null; then
  echo "Health check failed!"
  summit-admin env health
  exit 1
fi

echo "All services healthy"
```

#### Automated Tenant Provisioning

```bash
#!/bin/bash
TENANT_NAME="$1"
ADMIN_EMAIL="$2"

# Create tenant
RESULT=$(summit-admin --format json tenant create \
  --name "$TENANT_NAME" \
  --admin-email "$ADMIN_EMAIL" \
  --plan standard)

TENANT_ID=$(echo "$RESULT" | jq -r '.id')
echo "Created tenant: $TENANT_ID"
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Summit Admin CLI                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────────┐ │
│  │    env    │  │  tenant   │  │   data    │  │     security      │ │
│  │ commands  │  │ commands  │  │ commands  │  │     commands      │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────────┬─────────┘ │
│        │              │              │                  │           │
│  ┌─────┴──────────────┴──────────────┴──────────────────┴─────────┐ │
│  │                         API Client                              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │ │
│  │  │   Retry     │  │   Timeout   │  │    Audit Headers        │ │ │
│  │  │   Logic     │  │   Handling  │  │    (Nonce, Timestamp)   │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │ │
│  └───────────────────────────┬─────────────────────────────────────┘ │
├──────────────────────────────┼──────────────────────────────────────┤
│                              │                                       │
│  ┌───────────────────────────┴───────────────────────────────────┐  │
│  │                    Configuration & Profiles                    │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │  │
│  │  │   Tokens    │  │  Endpoints  │  │   Output Preferences  │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                              Utilities                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │   Output    │  │ Confirmation│  │   Audit     │  │   Logger   │  │
│  │  Formatter  │  │   Prompts   │  │  Recorder   │  │            │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │      IntelGraph Admin API    │
                    │  ┌────────────────────────┐  │
                    │  │   /admin/tenants       │  │
                    │  │   /admin/audit         │  │
                    │  │   /admin/security      │  │
                    │  │   /admin/graph         │  │
                    │  │   /health              │  │
                    │  └────────────────────────┘  │
                    └──────────────────────────────┘
```

## Development

### Prerequisites

- Node.js >= 18.18
- pnpm >= 9.12
- TypeScript >= 5.3

### Setup

```bash
cd tools/admin-cli
pnpm install
```

### Build

```bash
pnpm build
```

### Test

```bash
# Unit tests
pnpm test

# With coverage
pnpm test -- --coverage

# Watch mode
pnpm test -- --watch
```

### Type Check

```bash
pnpm typecheck
```

### Development Mode

```bash
# Run directly with tsx
pnpm dev env status

# Or use ts-node
npx tsx src/cli.ts env status
```

### Adding New Commands

1. Create command file in `src/commands/`:

```typescript
// src/commands/mycommand.ts
import { Command } from 'commander';

export function registerMyCommands(program: Command): void {
  const myCmd = new Command('mycommand')
    .description('My new command group');

  myCmd
    .command('subcommand')
    .description('My subcommand')
    .action(async (options, cmd) => {
      // Implementation
    });

  program.addCommand(myCmd);
}
```

2. Register in `src/commands/index.ts`
3. Add to `src/cli.ts`

## Security

### Token Handling

- Tokens are never logged or output
- Stored tokens are redacted in config display
- Environment variables preferred over file storage

### Audit Trail

Every CLI operation is logged:
- User identity (from token)
- Command and arguments
- Timestamp
- Result (success/failure)
- Duration

### Production Safeguards

- Extra confirmation for production environments
- Typed phrases for destructive operations
- Dry-run mode for previewing changes

### Network Security

- All API calls use HTTPS in production
- Request signing with nonce and timestamp
- Token-based authentication (Bearer)

## Troubleshooting

### Common Issues

#### "Authentication required"

```bash
# Check token is set
echo $INTELGRAPH_TOKEN

# Or configure profile
summit-admin config profile default --interactive
```

#### "Connection refused"

```bash
# Check endpoint
summit-admin config get profiles.default.endpoint

# Verify service is running
curl http://localhost:4000/health
```

#### "Permission denied"

Your user account may not have required permissions. Contact your administrator.

```bash
# Check your permissions
summit-admin security check-permission --user $(whoami) --permission admin:*
```

### Debug Mode

```bash
# Enable verbose logging
summit-admin --verbose env status

# Or set environment variable
VERBOSE=true summit-admin env status
```

### Getting Help

```bash
# General help
summit-admin --help

# Command-specific help
summit-admin tenant --help
summit-admin tenant create --help
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
