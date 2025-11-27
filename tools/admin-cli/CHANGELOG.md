# Changelog

All notable changes to the Summit Admin CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Plugin system for extensibility
- Integration test suite with mock server

## [1.0.0] - 2024-01-15

### Added

#### Core Features
- Unified CLI for IntelGraph platform administration
- Multi-profile configuration management
- Multiple output formats (JSON, table, YAML)
- Comprehensive audit logging

#### Environment Commands (`env`)
- `env status` - Show overall environment status with SLO metrics
- `env health` - Check health of all services with wait option
- `env services` - List all services with type filtering
- `env slo` - Show SLO metrics summary

#### Tenant Commands (`tenant`)
- `tenant list` - List all tenants with status filtering
- `tenant get` - Get detailed tenant information
- `tenant create` - Create new tenant (interactive and non-interactive)
- `tenant suspend` - Suspend tenant with confirmation
- `tenant reactivate` - Reactivate suspended tenant
- `tenant export-metadata` - Export tenant configuration
- `tenant update-quotas` - Update tenant quotas

#### Data Commands (`data`)
- `data backfill` - Run data backfill operations
- `data reindex` - Reindex search engine
- `data verify-integrity` - Verify data consistency
- `data status` - Check operation status with watch mode
- `data cancel` - Cancel running operations
- `data operations` - List recent data operations

#### Security Commands (`security`)
- `security keys` - List security keys
- `security rotate-keys` - Rotate security keys with grace period
- `security check-policies` - Run policy compliance checks
- `security audit` - View audit events
- `security revoke-tokens` - Revoke user/tenant tokens
- `security check-permission` - Check user permissions

#### Graph Commands (`graph`)
- `graph stats` - Show graph database statistics
- `graph health` - Check graph database health
- `graph query` - Execute read-only Cypher queries
- `graph schema` - Show graph schema
- `graph clear-cache` - Clear query cache
- `graph vacuum` - Run database maintenance
- `graph export` - Export graph data

#### Configuration Commands (`config`)
- `config show` - Show current configuration
- `config get/set` - Get/set configuration values
- `config profiles` - List profiles
- `config profile` - Add/update profile
- `config use` - Set default profile
- `config init` - Configuration wizard
- `config reset` - Reset to defaults

#### Safety Features
- Dry-run mode (`--dry-run`) for all operations
- Typed confirmation phrases for destructive operations
- Production environment safeguards
- Interactive mode requirements for dangerous operations

### Security
- Token-based authentication (Bearer)
- Audit trail for all operations
- Sensitive data redaction in logs
- Request signing with nonce and timestamp

### Documentation
- Comprehensive README with examples
- Architecture documentation with diagrams
- Operations guide for SRE teams
- API documentation

### DevOps
- CI/CD pipeline with GitHub Actions
- Docker support with multi-stage build
- Code coverage reporting
- Security scanning

## [0.1.0] - 2024-01-01

### Added
- Initial project structure
- Basic command framework with Commander.js
- Configuration management foundation

---

## Migration Guide

### Upgrading to 1.0.0

No migration required for new installations.

### Configuration Changes

The CLI stores configuration in `~/.config/summit-admin-cli/config.json`. The schema is:

```json
{
  "defaultProfile": "string",
  "defaultEndpoint": "string",
  "profiles": {
    "<name>": {
      "endpoint": "string",
      "token": "string (optional)",
      "defaultFormat": "table | json | yaml"
    }
  }
}
```

### Breaking Changes

None - this is the initial stable release.
