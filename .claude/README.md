# Claude Code Strategic Framework

> **Summit/IntelGraph Platform** - AI-Assisted Development Configuration

This directory contains the Claude Code configuration for the Summit/IntelGraph platform, enabling efficient AI-assisted development with proper guardrails, conventions, and productivity tools.

## Directory Structure

```
.claude/
├── commands/           # Custom slash commands for common tasks
│   ├── build.md       # Build all packages
│   ├── test.md        # Run test suites
│   ├── pr.md          # Create pull requests
│   ├── review.md      # Code review assistance
│   ├── debug.md       # Debugging helpers
│   ├── graphql.md     # GraphQL operations
│   ├── db.md          # Database operations
│   ├── smoke.md       # Smoke test runner
│   ├── health.md      # Health check endpoints
│   ├── lint-fix.md    # Lint and format code
│   ├── security.md    # Security scanning
│   ├── metrics.md     # Codebase metrics
│   ├── golden-path.md # Full golden path validation
│   └── new-service.md # Create new service scaffold
├── settings.json      # Project-level settings
├── settings.local.json # User-specific settings (gitignored portions)
├── mcp.json           # MCP server configurations
└── README.md          # This file
```

## Quick Start

### Available Slash Commands

| Command | Description |
|---------|-------------|
| `/build` | Build all packages with turbo |
| `/test` | Run test suites (unit, integration, e2e) |
| `/pr` | Create a pull request with proper formatting |
| `/review` | Get code review suggestions |
| `/debug <issue>` | Debug a specific issue |
| `/graphql` | GraphQL schema and query operations |
| `/db` | Database migrations and operations |
| `/smoke` | Run golden path smoke tests |
| `/health` | Check service health endpoints |
| `/lint-fix` | Lint and format all code |
| `/security` | Run security scans |
| `/metrics` | Generate codebase metrics |
| `/golden-path` | Run full bootstrap → up → smoke |
| `/new-service <name>` | Scaffold a new microservice |

### Usage Examples

```bash
# Run smoke tests
/smoke

# Create a PR for current changes
/pr

# Check health of all services
/health

# Debug a failing test
/debug "EntityService test failing"

# Run security scan
/security
```

## Configuration Files

### `settings.json`

Project-level settings that apply to all team members:
- Project metadata and conventions
- Golden path commands
- Code quality tool configurations
- Database connection patterns
- Security requirements
- CI/CD check requirements

### `settings.local.json`

User-specific settings and permission overrides:
- Allowed/denied bash commands
- Personal tool preferences
- Session-specific configurations

### `mcp.json`

Model Context Protocol server configurations:
- External tool integrations
- API connections
- Custom capabilities

## Development Workflow

### The Golden Path

Summit follows a strict "golden path" for development:

```bash
# 1. Bootstrap environment
make bootstrap

# 2. Start services
make up

# 3. Validate everything works
make smoke
```

**Rule**: Fresh clones must go green before writing code.

### Using Claude Code Effectively

1. **Before Making Changes**
   - Use `/health` to verify services are running
   - Use `/review` to understand existing patterns

2. **While Developing**
   - Use `/lint-fix` frequently
   - Use `/test` before committing

3. **Before Committing**
   - Use `/smoke` to validate golden path
   - Use `/security` for security-sensitive changes
   - Use `/pr` to create well-formatted PRs

### AI Assistant Guardrails

**DO:**
- Follow existing patterns and conventions
- Add tests for new functionality
- Use TypeScript types/interfaces
- Handle errors gracefully
- Run smoke tests before committing

**DON'T:**
- Commit secrets or credentials
- Skip the smoke test
- Introduce breaking changes without discussion
- Use `any` excessively
- Commit with `.only()` or `.skip()` in tests

## Team Conventions

### Commit Messages

Follow Conventional Commits:
```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
```

### Branch Naming

```
feature/<name>     # New features
fix/<name>         # Bug fixes
claude/<session>   # AI-assisted work
```

### Code Style

- TypeScript strict mode (gradual migration)
- Prettier for formatting
- ESLint for linting
- Import order: external → internal → relative

## Troubleshooting

### Common Issues

**Services won't start:**
```bash
make down
docker system prune -af
make up
```

**Tests failing:**
```bash
jest --clearCache
pnpm test -- --verbose
```

**Smoke test fails:**
```bash
curl http://localhost:4000/health
docker-compose logs api
```

## Security

- Never commit secrets to `.env` files
- Use Gitleaks for pre-commit secret scanning
- Run `pnpm security:scan` before security-sensitive changes
- Follow OWASP guidelines for input validation

## Resources

- [CLAUDE.md](../CLAUDE.md) - Comprehensive project guide
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System architecture
- [docs/ONBOARDING.md](../docs/ONBOARDING.md) - Developer onboarding
- [docs/Copilot-Playbook.md](../docs/Copilot-Playbook.md) - AI assistance guide

---

**Remember**: The golden path is sacred. Keep it green!
