# Summit CLI

Unified command-line interface for the IntelGraph Summit platform. Summit CLI provides a canonical entry point for all operations, consolidating 300+ scripts, 25+ CLI tools, and multiple build systems into a single, discoverable interface suitable for both humans and AI agents.

## Installation

```bash
# From workspace root
cd summit-cli
pnpm install
pnpm link --global

# Or using the workspace
pnpm add -g @intelgraph/summit-cli
```

## Quick Start

```bash
# Initialize your environment (first time setup)
summit init

# Start development stack
summit dev up

# Check service status
summit dev status

# Run smoke tests (golden path validation)
summit test smoke

# Run database migrations
summit db migrate

# Deploy to staging
summit deploy staging

# System health check
summit doctor
```

## Command Overview

### `summit dev` - Development Workflow

Manage your local development environment:

```bash
summit dev up              # Start development stack
summit dev up --profile ai # Start with AI services
summit dev down            # Stop services
summit dev restart         # Restart services
summit dev status          # Show service status
summit dev logs            # View logs
summit dev logs -f postgres # Follow postgres logs
summit dev build           # Build services
summit dev shell postgres  # Open shell in postgres container
```

### `summit test` - Testing

Run various test suites:

```bash
summit test smoke          # Smoke tests (golden path)
summit test unit           # Unit tests
summit test integration    # Integration tests
summit test e2e            # End-to-end tests
summit test policy         # Policy validation
summit test all            # All test suites
```

### `summit db` - Database Operations

Manage databases and migrations:

```bash
summit db migrate          # Run all migrations
summit db migrate --target postgres  # Postgres only
summit db rollback         # Rollback last migration
summit db seed             # Seed with data
summit db seed --demo      # Seed with demo data
summit db reset --force    # Reset database (DANGEROUS)
summit db status           # Migration status
summit db backup           # Create backup
summit db backup --s3      # Backup to S3
summit db restore backup.sql --force  # Restore from backup
```

### `summit deploy` - Deployment

Deploy to various environments:

```bash
summit deploy dev          # Deploy to development
summit deploy staging      # Deploy to staging (canary)
summit deploy prod --force # Deploy to production
summit deploy rollback prod # Rollback production
summit deploy status       # Check deployment status
```

### `summit pipelines` - Pipeline Orchestration

Execute and manage data pipelines:

```bash
summit pipelines run workflow.yaml       # Run pipeline
summit pipelines run workflow.yaml --engine maestro
summit pipelines list                    # List pipelines
summit pipelines status <id>             # Check status
summit pipelines cancel <id>             # Cancel pipeline
summit pipelines validate workflow.yaml  # Validate definition
```

### `summit copilot` - AI Assistant

AI-powered assistance and automation:

```bash
summit copilot chat                      # Interactive copilot
summit copilot task "implement feature X" # Run AI task
summit copilot retrieve "query string"   # Search docs
summit copilot index                     # Update index
```

### `summit catalog` - Data Catalog

Browse and inspect data catalog:

```bash
summit catalog list                      # List entities
summit catalog list --type dataset       # Filter by type
summit catalog inspect entity-id         # Entity details
summit catalog search "query"            # Search catalog
summit catalog lineage entity-id         # View lineage
summit catalog export                    # Export metadata
```

### `summit verify` - Verification & Validation

Verify system compliance and integrity:

```bash
summit verify audit                      # Verify audit logs
summit verify claims claims.json         # Verify claims
summit verify images                     # Verify container images
summit verify signatures file.txt        # Verify signatures
summit verify policy                     # Verify policy compliance
summit verify slo --window 24h           # Verify SLOs
```

### `summit rules` - Detection Rules

Manage detection rules:

```bash
summit rules validate rule.yml           # Validate rule
summit rules test rule.yml               # Test rule
summit rules list                        # List all rules
summit rules deploy                      # Deploy rules
```

### `summit doctor` - System Diagnostics

Run comprehensive health checks:

```bash
summit doctor                            # Run all checks
summit doctor --verbose                  # Detailed output
summit doctor --fix                      # Attempt auto-fix
```

### `summit init` - Environment Setup

Bootstrap your environment:

```bash
summit init                              # Interactive setup
summit init --auto                       # Automatic setup
```

## Machine-Readable Output

All commands support machine-readable output for AI agents and automation:

### JSON Mode

```bash
summit dev status --json
```

Output:

```json
{
  "command": "summit dev status",
  "startTime": "2025-01-20T10:30:00Z",
  "endTime": "2025-01-20T10:30:01Z",
  "success": true,
  "data": {
    "services": [
      {
        "name": "postgres",
        "status": "running",
        "health": "healthy",
        "ports": "5432:5432"
      }
    ]
  }
}
```

### NDJSON Mode (Streaming)

For long-running operations:

```bash
summit dev up --ndjson
```

Output:

```json
{"type":"start","command":"dev up","timestamp":"2025-01-20T10:30:00Z"}
{"type":"progress","service":"postgres","status":"starting","timestamp":"2025-01-20T10:30:01Z"}
{"type":"progress","service":"postgres","status":"healthy","timestamp":"2025-01-20T10:30:05Z"}
{"type":"complete","success":true,"timestamp":"2025-01-20T10:30:10Z"}
```

## Global Options

All commands support these global flags:

- `--json` - JSON output format
- `--ndjson` - Newline-delimited JSON (streaming)
- `--no-color` - Disable colored output
- `--verbose` / `-v` - Verbose logging
- `--quiet` / `-q` - Minimal output
- `--config <path>` - Custom config file
- `--help` / `-h` - Show help
- `--version` - Show version

## Configuration

### Config File

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
  output: {
    defaultFormat: 'human',
    color: true,
  },
  copilot: {
    model: 'claude-3-5-sonnet-20241022',
    retriever: 'http://localhost:8765',
  },
};
```

Config file locations (precedence order):

1. `--config` flag
2. `./summit.config.js` (project-specific)
3. `~/.summit/config.js` (user-specific)
4. Built-in defaults

## AI Agent Usage

Summit CLI is designed to be AI-agent friendly:

1. **Discoverable**: All commands via `summit --help`
2. **Machine-readable**: Use `--json` or `--ndjson` flags
3. **Consistent**: Uniform argument patterns and output formats
4. **Self-documenting**: Every command has detailed help text

Example AI workflow:

```bash
# AI agent checks system health
summit doctor --json

# AI agent starts dev stack
summit dev up --ndjson

# AI agent verifies golden path
summit test smoke --json

# AI agent queries for information
summit copilot retrieve "how to deploy" --json
```

## Migration from Existing Tools

### Command Mapping

| Old Command                   | New Command                         |
| ----------------------------- | ----------------------------------- |
| `make up`                     | `summit dev up`                     |
| `make down`                   | `summit dev down`                   |
| `npm run smoke`               | `summit test smoke`                 |
| `npm run db:migrate`          | `summit db migrate`                 |
| `make stage`                  | `summit deploy staging`             |
| `make prod`                   | `summit deploy prod`                |
| `just conductor-up`           | `summit dev up --profile conductor` |
| `just conductor-status`       | `summit dev status`                 |
| `./scripts/health-check.sh`   | `summit doctor`                     |
| `ig-detect validate rule.yml` | `summit rules validate rule.yml`    |
| `aer-verify ledger.json`      | `summit verify audit ledger.json`   |

### Backward Compatibility

The Summit CLI wraps existing tools, so all your existing scripts and workflows continue to work. The CLI provides a unified interface without breaking existing automation.

## Development

### Project Structure

```
summit-cli/
├── bin/
│   └── summit.js          # CLI entry point
├── src/
│   ├── index.js           # Main program
│   ├── lib/
│   │   ├── config.js      # Configuration loading
│   │   ├── output.js      # Output formatting
│   │   └── executor.js    # Command execution
│   └── commands/
│       ├── dev.js         # Development commands
│       ├── test.js        # Testing commands
│       ├── db.js          # Database commands
│       ├── deploy.js      # Deployment commands
│       ├── pipelines.js   # Pipeline commands
│       ├── copilot.js     # AI copilot commands
│       ├── catalog.js     # Catalog commands
│       ├── verify.js      # Verification commands
│       ├── rules.js       # Rules commands
│       ├── doctor.js      # Diagnostics
│       └── init.js        # Bootstrap
├── DESIGN.md              # Design document
├── package.json
└── README.md
```

### Adding New Commands

1. Create a new command file in `src/commands/`
2. Register it in `src/index.js`
3. Follow existing patterns for consistency

Example:

```javascript
// src/commands/mycommand.js
import { Command } from 'commander';
import { Executor } from '../lib/executor.js';

export function registerMyCommands(program, config, output) {
  const myCmd = new Command('mycmd').description('My new command group');

  myCmd
    .command('action')
    .description('Perform an action')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('mycmd action', options);
        out.spin('Performing action...');

        // Your logic here

        out.spinSucceed('Action completed');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Action failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  program.addCommand(myCmd);
}
```

## Contributing

When adding new commands:

1. Maintain consistent output patterns
2. Support `--json` and `--ndjson` modes
3. Add comprehensive help text
4. Handle errors gracefully
5. Update documentation

## License

UNLICENSED - Internal use only

## Support

- Documentation: See `docs/summit-cli-quickstart.md`
- Issues: Report in project issue tracker
- Help: Run `summit --help` or `summit <command> --help`
