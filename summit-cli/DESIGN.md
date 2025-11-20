# Summit CLI Design Document

## Overview

The Summit CLI provides a canonical entry point for all IntelGraph operations, consolidating 300+ scripts, 25+ CLI tools, and multiple build systems into a unified, discoverable interface suitable for both humans and AI agents.

## Design Principles

1. **Discoverability**: All commands via `summit --help`, hierarchical structure
2. **Consistency**: Uniform argument patterns, output formats, error handling
3. **Machine-readable**: `--json` and `--ndjson` output modes for programmatic consumption
4. **Thin orchestration**: Wraps existing tools, doesn't reimplement logic
5. **Stable API**: Versioned commands with deprecation warnings
6. **Progressive disclosure**: Common commands at top level, advanced in subcommands

## Command Taxonomy

```
summit
├── dev              Development workflow commands
│   ├── up           Start development stack
│   ├── down         Stop development stack
│   ├── restart      Restart services
│   ├── status       Service health status
│   ├── logs         View service logs
│   ├── build        Build services
│   └── shell        Interactive dev shell
│
├── pipelines        Pipeline and workflow orchestration
│   ├── run          Execute a pipeline
│   ├── list         List available pipelines
│   ├── status       Check pipeline status
│   ├── cancel       Cancel running pipeline
│   ├── logs         View pipeline logs
│   └── validate     Validate pipeline definition
│
├── copilot          AI assistant and automation
│   ├── chat         Interactive copilot session
│   ├── task         Run automated task
│   ├── retrieve     Document retrieval
│   └── index        Build/update document index
│
├── catalog          Data catalog operations
│   ├── list         List catalog entities
│   ├── inspect      Inspect entity details
│   ├── search       Search catalog
│   ├── lineage      View data lineage
│   └── export       Export catalog metadata
│
├── test             Testing commands
│   ├── smoke        Run smoke tests
│   ├── e2e          End-to-end tests
│   ├── unit         Unit tests
│   ├── integration  Integration tests
│   ├── policy       Policy validation tests
│   └── all          Run all test suites
│
├── deploy           Deployment operations
│   ├── dev          Deploy to development
│   ├── staging      Deploy to staging (with canary)
│   ├── prod         Deploy to production
│   ├── rollback     Rollback deployment
│   ├── status       Deployment status
│   └── validate     Pre-deployment validation
│
├── db               Database operations
│   ├── migrate      Run migrations
│   ├── rollback     Rollback migrations
│   ├── seed         Seed data
│   ├── reset        Reset database
│   ├── status       Migration status
│   ├── backup       Create backup
│   └── restore      Restore from backup
│
├── verify           Verification and validation
│   ├── audit        Audit log verification
│   ├── claims       Claim verification
│   ├── images       Container image verification
│   ├── signatures   Cryptographic signature verification
│   ├── policy       Policy compliance verification
│   └── slo          SLO verification
│
├── rules            Detection rule management
│   ├── validate     Validate detection rules
│   ├── test         Test rules against data
│   ├── list         List available rules
│   └── deploy       Deploy rules to system
│
├── doctor           System diagnostics
│   └── (no subcommands, runs comprehensive health check)
│
├── init             Bootstrap and setup
│   └── (interactive wizard for environment setup)
│
└── version          Show version and component info
```

## Output Modes

### Human-readable (default)

- Colored output with status indicators
- Progress bars for long operations
- Formatted tables and lists
- Interactive prompts when needed

### JSON (`--json`)

```json
{
  "command": "summit dev status",
  "timestamp": "2025-01-20T10:30:00Z",
  "success": true,
  "data": {
    "services": [
      {
        "name": "postgres",
        "status": "running",
        "health": "healthy",
        "uptime": "2h 15m"
      }
    ]
  }
}
```

### NDJSON (`--ndjson`)

```json
{"type":"start","command":"summit dev up","timestamp":"2025-01-20T10:30:00Z"}
{"type":"progress","service":"postgres","status":"starting","timestamp":"2025-01-20T10:30:01Z"}
{"type":"progress","service":"postgres","status":"healthy","timestamp":"2025-01-20T10:30:05Z"}
{"type":"complete","success":true,"timestamp":"2025-01-20T10:30:10Z"}
```

## Global Flags

- `--json` - JSON output mode
- `--ndjson` - Newline-delimited JSON (streaming)
- `--no-color` - Disable colored output
- `--verbose` / `-v` - Verbose logging
- `--quiet` / `-q` - Minimal output
- `--config <path>` - Custom config file
- `--help` / `-h` - Show help
- `--version` - Show version

## Configuration

### Config File Locations (precedence order)

1. `--config` flag
2. `./summit.config.js` (project-specific)
3. `~/.summit/config.js` (user-specific)
4. Built-in defaults

### Config Schema

```javascript
module.exports = {
  // Development settings
  dev: {
    composeFile: './compose/docker-compose.yml',
    profiles: ['default'], // or ['ai', 'gpu', 'observability']
    autoMigrate: true,
    autoSeed: false,
  },

  // Pipeline settings
  pipelines: {
    defaultEngine: 'maestro', // or 'chronos', 'argo'
    workflowDir: './workflows',
  },

  // Deployment settings
  deploy: {
    registry: 'ghcr.io/yourusername',
    defaultRegion: 'us-west-2',
    verifyImages: true,
  },

  // Output settings
  output: {
    defaultFormat: 'human', // or 'json', 'ndjson'
    color: true,
    emoji: false,
  },

  // AI/Copilot settings
  copilot: {
    model: 'claude-3-5-sonnet-20241022',
    retriever: 'http://localhost:8765',
  },
};
```

## Implementation Strategy

### Phase 1: Core Infrastructure

1. Create `summit-cli` package with commander.js
2. Implement output formatters (human, JSON, NDJSON)
3. Add config file loading
4. Build plugin system for subcommands

### Phase 2: Essential Commands

1. `summit dev` - wraps docker compose, Justfile conductor commands
2. `summit test` - wraps npm test scripts, smoke tests
3. `summit db` - wraps Prisma, Knex, migration scripts
4. `summit doctor` - wraps health-check.sh, adds diagnostics

### Phase 3: Advanced Features

1. `summit deploy` - wraps deployment scripts, Makefiles
2. `summit pipelines` - wraps maestro, chronos, argo
3. `summit verify` - consolidates verification CLIs
4. `summit copilot` - wraps assistant server

### Phase 4: Polish & Documentation

1. Comprehensive help text
2. Interactive `summit init` wizard
3. Documentation and quickstart guide
4. Migration guide for existing scripts

## Command Mapping (Existing → New)

### Development

- `make up` → `summit dev up`
- `just conductor-up` → `summit dev up --profile conductor`
- `make up-ai` → `summit dev up --profile ai`
- `just conductor-status` → `summit dev status`
- `just conductor-logs` → `summit dev logs`

### Testing

- `npm run smoke` → `summit test smoke`
- `npm run test:e2e` → `summit test e2e`
- `./scripts/health-check.sh` → `summit doctor`

### Database

- `npm run db:migrate` → `summit db migrate`
- `npm run db:seed` → `summit db seed`
- `make migrate` → `summit db migrate`

### Deployment

- `make stage` → `summit deploy staging`
- `make prod` → `summit deploy prod`
- `./deploy/go-live-now.sh` → `summit deploy prod --full-stack`

### Verification

- `aer-verify` → `summit verify audit`
- `claim-verifier` → `summit verify claims`
- `./scripts/audit-verify.sh` → `summit verify audit`

### Pipelines

- `maestro run <workflow>` → `summit pipelines run <workflow> --engine maestro`
- `chronos-intent compile` → `summit pipelines validate`

### Rules

- `ig-detect validate` → `summit rules validate`

## Backward Compatibility

### Symlinks (optional)

Create symlinks for common operations:

```bash
ln -s summit ig-detect
ln -s summit maestro
```

### Environment Detection

Auto-detect context and adjust defaults:

- In CI: `--no-color --quiet` by default
- In Docker: Skip Docker-based commands
- In GitHub Actions: Enhanced logging

## Success Metrics

1. **Discoverability**: New engineers can start dev stack with `summit --help` + `summit dev up`
2. **AI-friendly**: AI agents can parse `summit --json` output and understand available commands
3. **Coverage**: 80%+ of common workflows accessible via Summit CLI
4. **Performance**: CLI startup < 100ms, command dispatch < 200ms
5. **Documentation**: Every command has help text, 90%+ have examples

## Future Enhancements

1. **Plugins**: Third-party command extensions
2. **Telemetry**: Opt-in usage analytics
3. **Auto-update**: Self-updating CLI
4. **Shell completion**: Bash, Zsh, Fish completions
5. **Web UI**: Terminal UI mode for interactive operations
6. **Remote execution**: Execute commands on remote environments
