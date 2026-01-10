# IntelGraph CLI

Cross-platform command-line interface for IntelGraph graph queries, agent spins, and air-gapped exports.

## Features

- **Graph Queries**: Execute Cypher queries against Neo4j
- **Agent Management**: Spin up and manage investigation, analysis, and enrichment agents
- **Air-Gapped Exports**: Export graph data with integrity verification for secure transfers
- **PgVector Sync**: Synchronize graph embeddings with PostgreSQL pgvector

## Installation

### From npm

```bash
npm install -g @intelgraph/cli
```

### From Binary

Download the appropriate binary for your platform from the releases page:

- `intelgraph-linux` - Linux x64
- `intelgraph-macos` - macOS x64
- `intelgraph-macos-arm64` - macOS ARM64 (Apple Silicon)
- `intelgraph-win.exe` - Windows x64

### From Source

```bash
git clone https://github.com/BrianCLong/summit.git
cd summit/cli
pnpm install
pnpm build
```

## Quick Start

### Summit Doctor (local environment health)

Build the CLI and run the developer doctor locally:

```bash
pnpm --filter @intelgraph/cli build
node cli/dist/summit.js doctor --fix
```

Use `--json` for machine-readable output or `--env-file` to point at a custom `.env`.

### Automation (golden path)

The `summit` binary is the preferred entrypoint for local automation:

```bash
# Bootstrap and start the local stack (structured JSON available with --json)
pnpm --filter @intelgraph/cli build && node dist/summit.js init

# Run repo validation
node dist/summit.js check --json

# Execute the test suites
node dist/summit.js test

# Inspect release readiness without publishing
node dist/summit.js release-dry-run --json
```

### Initialize Configuration

```bash
# Create local config file
intelgraph config init

# Create global config file
intelgraph config init --global
```

### Configure Connections

Edit `.intelgraphrc.yaml`:

```yaml
defaultProfile: default
profiles:
  default:
    neo4j:
      uri: bolt://localhost:7687
      user: neo4j
      password: your-password
      database: neo4j
    postgres:
      host: localhost
      port: 5432
      database: intelgraph
      user: postgres
      password: your-password
```

Or use environment variables:

```bash
export NEO4J_URI=bolt://localhost:7687
export NEO4J_USER=neo4j
export NEO4J_PASSWORD=password
export DATABASE_URL=postgres://user:pass@localhost:5432/intelgraph
```

## Commands

### Graph Commands

```bash
# Execute Cypher query
intelgraph graph query "MATCH (n:Person) RETURN n LIMIT 10"

# List nodes by label
intelgraph graph nodes --label Person --limit 50

# List relationships
intelgraph graph relationships --type KNOWS

# Find paths between nodes
intelgraph graph path <startId> <endId> --max-depth 5

# Get node neighbors
intelgraph graph neighbors <nodeId> --direction out

# Show graph statistics
intelgraph graph stats

# Check connection health
intelgraph graph health
```

### Agent Commands

```bash
# Spin up an agent
intelgraph agent spin investigation "Case Analysis" --params '{"target": "entity-123"}'

# Spin up agent asynchronously
intelgraph agent spin analysis "Pattern Detection" --async

# Batch spin from config file
intelgraph agent spin-batch --file agents.yaml --parallel

# Check agent status
intelgraph agent status <agentId>

# Cancel running agent
intelgraph agent cancel <agentId>

# List agents
intelgraph agent list --type investigation --status running

# View agent logs
intelgraph agent logs <agentId> --follow

# List available agent types
intelgraph agent types
```

Agent Types:

- `investigation` - Case investigation workflows
- `enrichment` - Data enrichment from external sources
- `analysis` - Pattern and anomaly analysis
- `correlation` - Entity correlation and clustering
- `report` - Report generation

### Export Commands

```bash
# Export graph data
intelgraph export graph --format json --output ./exports

# Export with filters
intelgraph export graph --labels Person,Organization --types WORKS_FOR

# Export with compression and signing
intelgraph export graph --compress --sign

# Import exported data
intelgraph export import ./exports/export-abc123

# Verify export integrity
intelgraph export verify ./exports/export-abc123

# List exports
intelgraph export list

# Show supported formats
intelgraph export formats
```

### Sync Commands (PgVector)

```bash
# Initialize pgvector table
intelgraph sync init --dimension 1536 --table node_embeddings

# Sync graph to pgvector
intelgraph sync run --batch-size 1000

# Search by similarity
intelgraph sync search "query text" --limit 10 --threshold 0.8

# Get embedding for node
intelgraph sync get <nodeId>

# Delete embedding
intelgraph sync delete <nodeId>

# Show sync statistics
intelgraph sync stats

# Check pgvector health
intelgraph sync health
```

### Run Commands (Policy, Sandbox, and Git Workflow)

The `run` command provides a safe execution environment with policy enforcement, sandbox guardrails, and git-native atomic PR workflow support.

#### Status and Validation

```bash
# Show git, policy, and sandbox status
intelgraph run status --output json

# Validate configuration before execution
intelgraph run check --ci --policy-bundle ./policy
```

#### Sandbox Guardrails

```bash
# Execute with path restrictions
intelgraph run exec git status --allow-tool git --allow-path .

# Execute with multiple allowed tools
intelgraph run exec rg "pattern" --allow-tool rg --allow-tool git

# Execute in CI mode with strict controls
intelgraph run exec npm test \
  --ci \
  --allow-tool npm \
  --allow-tool node \
  --allow-path . \
  --tool-timeout-ms 300000 \
  --output json
```

#### Git Workflow

```bash
# Create or switch to branch
intelgraph run branch feature/my-feature --allow-dirty

# Commit changes with review artifact
intelgraph run commit "feat: add new feature" \
  --allow-dirty \
  --generate-review

# Generate review.md for PR
intelgraph run review main --output json
```

#### Policy and Sandbox Flags

| Flag                             | Description                              | Default   |
| -------------------------------- | ---------------------------------------- | --------- |
| `--ci`                           | Enable CI mode (fail-closed policy)      | `false`   |
| `--policy-bundle <dir>`          | Path to OPA policy bundle directory      | -         |
| `--allow-path <path>`            | Additional paths to allow (repeatable)   | repo root |
| `--deny-path <pattern>`          | Additional deny patterns (repeatable)    | -         |
| `--allow-tool <tool>`            | Tools allowed for execution (repeatable) | none      |
| `--tool-timeout-ms <ms>`         | Timeout for tool execution               | `120000`  |
| `--allow-network`                | Allow network access                     | `false`   |
| `--allow-dotenv`                 | Allow .env file access                   | `false`   |
| `--unsafe-allow-sensitive-paths` | Disable hardcoded security patterns      | `false`   |

#### Git Workflow Flags

| Flag                    | Description                              | Default     |
| ----------------------- | ---------------------------------------- | ----------- |
| `--allow-dirty`         | Allow operation with uncommitted changes | `false`     |
| `--generate-review`     | Generate review.md artifact              | `false`     |
| `--review-path <path>`  | Path for review.md artifact              | `review.md` |
| `-o, --output <format>` | Output format: text or json              | `text`      |
| `--dry-run`             | Show what would happen without executing | `false`     |

#### Provider Reliability Flags

| Flag                       | Description               | Default   |
| -------------------------- | ------------------------- | --------- |
| `--max-retries <n>`        | Maximum retry attempts    | `3`       |
| `--initial-backoff-ms <n>` | Initial backoff delay     | `500`     |
| `--max-backoff-ms <n>`     | Maximum backoff delay     | `8000`    |
| `--timeout-ms <n>`         | Per-request timeout       | `120000`  |
| `--budget-ms <n>`          | Total time budget for run | unlimited |
| `--max-requests <n>`       | Maximum provider requests | unlimited |
| `--token-budget <n>`       | Maximum tokens to use     | unlimited |

#### Default Deny Patterns

The following patterns are **always denied** (cannot be overridden unless `--unsafe-allow-sensitive-paths` is set):

- `.git/**` - Git internals
- `**/*.pem`, `**/*.key`, `**/*.p12`, `**/*.pfx` - Private keys
- `**/id_rsa*`, `**/*_ed25519*` - SSH keys
- `**/secrets/**` - Secrets directories
- `**/.env`, `**/.env.*` - Environment files (requires `--allow-dotenv`)

#### CI-Safe Example

```bash
# Full CI example with all safety controls
intelgraph run exec npm test \
  --ci \
  --policy-bundle ./policy \
  --allow-path . \
  --allow-tool npm \
  --allow-tool node \
  --allow-tool git \
  --allow-network \
  --max-retries 3 \
  --timeout-ms 120000 \
  --budget-ms 900000 \
  --output json
```

#### Session Management and Replay

The CLI maintains session audit trails with structured event logs for debugging and compliance.

```bash
# List recent sessions
intelgraph run sessions list --limit 10

# Show session details
intelgraph run sessions show session-abc123def456

# Clean old sessions (older than 7 days)
intelgraph run sessions clean --max-age-days 7
```

#### Replay and Event Logs

Each run creates a JSONL event log at `.claude/sessions/<session-id>/events.jsonl`.

```bash
# Replay session and show summary
intelgraph run replay session-abc123

# Replay with JSON output
intelgraph run replay session-abc123 --output json

# Generate markdown report
intelgraph run replay session-abc123 --write-report
```

**Event Types:**

- `run_start` - Command and environment info
- `step_start` - Step initialization
- `action` - File read/write/patch operations
- `provider_call` - LLM provider interactions
- `tool_exec` - Tool executions
- `run_end` - Final status and diagnostics
- `error` - Error conditions

**Event Log Format:**

```jsonl
{"data":{...},"run_id":"session-abc123","seq":1,"ts":null,"type":"run_start","v":1}
{"data":{...},"run_id":"session-abc123","seq":2,"ts":null,"type":"action","v":1}
```

**Determinism:**

- Timestamps are omitted by default (`ts: null`)
- Use `--include-timestamps` to include epoch milliseconds
- All arrays are stable-sorted for reproducible output

**Redaction:**
Events are automatically redacted to remove sensitive data:

- API keys (`sk-*`, `ghp_*`, GitHub tokens)
- Bearer/JWT tokens
- AWS credentials
- Password/secret/token fields

Use `--unsafe-log-prompts` to disable redaction (not recommended).

#### Event Logging Flags

| Flag                   | Description                      | Default |
| ---------------------- | -------------------------------- | ------- |
| `--include-timestamps` | Include timestamps in event logs | `false` |
| `--unsafe-log-prompts` | Disable redaction (dangerous)    | `false` |

#### Exit Codes

| Code | Meaning                                                      |
| ---- | ------------------------------------------------------------ |
| 0    | Success                                                      |
| 1    | General/unexpected error                                     |
| 2    | Policy/sandbox violation, budget exceeded, session not found |
| 3    | Provider error after retries exhausted                       |

### Determinism Commands

The determinism harness verifies reproducible output by running commands multiple times and comparing results.

```bash
# Run a command 3 times and verify identical output
intelgraph determinism run node dist/summit.js check --json

# Run with custom options
intelgraph determinism run <command> [args...] \
  --runs 5 \
  --hash sha256 \
  --output-dir ./evidence \
  --fail-fast

# Also run package tests
intelgraph determinism run <command> --package @intelgraph/cli

# Verify existing evidence
intelgraph determinism verify .claude/determinism/det-abc123

# Clean old evidence (older than 7 days)
intelgraph determinism clean --max-age-days 7
```

#### Determinism Flags

| Flag                   | Description                          | Default                     |
| ---------------------- | ------------------------------------ | --------------------------- |
| `-n, --runs <n>`       | Number of runs                       | `3`                         |
| `--output-dir <path>`  | Output directory for evidence        | `.claude/determinism/<id>/` |
| `--fail-fast`          | Stop on first mismatch               | `true`                      |
| `--hash <algo>`        | Hash algorithm (sha256, sha512, md5) | `sha256`                    |
| `--include-stdout`     | Store full stdout in evidence        | `false`                     |
| `--package <name>`     | Also run package tests N times       | -                           |
| `--require-tests-pass` | Fail if package tests fail           | `false`                     |
| `--include-timestamps` | Include timestamps in output         | `false`                     |

#### Deterministic Mode

When running commands, the harness enforces:

- `--output json` and `--ci` flags
- `TZ=UTC`, `LC_ALL=C` environment
- Color output disabled

#### Evidence Artifacts

Each run creates:

- `evidence.json` - Structured verification data
- `evidence.md` - Human-readable report for PRs
- `diff.md` - Mismatch details (on failure)
- `run-N.json` - Per-run outputs (on failure or with `--include-stdout`)

**Example evidence.md:**

```markdown
# Determinism Evidence

## Command

intelgraph check --json --ci

## Results

- **Runs**: 3
- **Match**: Yes
- **Hash Algorithm**: sha256

## Hashes

1. `a1b2c3...` ✓
2. `a1b2c3...` ✓
3. `a1b2c3...` ✓
```

### Config Commands

```bash
# Show configuration
intelgraph config show

# Set configuration value
intelgraph config set neo4j.uri bolt://newhost:7687 --profile production

# Get configuration value
intelgraph config get neo4j.uri

# List profiles
intelgraph config profiles

# Add profile
intelgraph config add-profile staging --copy-from default

# Remove profile
intelgraph config remove-profile staging

# Set default profile
intelgraph config set-default production

# Validate configuration
intelgraph config validate
```

## Global Options

```bash
--config <path>    Path to config file
--profile <name>   Use named profile
--json             Output as JSON
--quiet            Suppress non-essential output
--verbose          Enable verbose output
-v, --version      Show version
-h, --help         Show help
```

## Environment Variables

| Variable            | Description               |
| ------------------- | ------------------------- |
| `NEO4J_URI`         | Neo4j connection URI      |
| `NEO4J_USER`        | Neo4j username            |
| `NEO4J_PASSWORD`    | Neo4j password            |
| `NEO4J_DATABASE`    | Neo4j database name       |
| `PGHOST`            | PostgreSQL host           |
| `PGPORT`            | PostgreSQL port           |
| `PGDATABASE`        | PostgreSQL database       |
| `PGUSER`            | PostgreSQL username       |
| `PGPASSWORD`        | PostgreSQL password       |
| `DATABASE_URL`      | PostgreSQL connection URL |
| `AGENT_ENDPOINT`    | Remote agent service URL  |
| `AGENT_API_KEY`     | Agent service API key     |
| `INTELGRAPH_CONFIG` | Config file path          |
| `DEBUG`             | Enable debug output       |

## Configuration File

The CLI looks for configuration in the following locations (in order):

1. Path specified via `--config` flag
2. `INTELGRAPH_CONFIG` environment variable
3. `.intelgraphrc` in current directory
4. `.intelgraphrc.yaml` in current directory
5. `~/.intelgraph/config.yaml`
6. `~/.intelgraphrc`

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run in development
pnpm dev -- graph stats

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## Building Binaries

```bash
# Build all platform binaries
pnpm pkg:all

# Build specific platform
pnpm pkg:linux
pnpm pkg:macos
pnpm pkg:macos-arm
pnpm pkg:windows
```

## License

MIT
