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

| Variable | Description |
|----------|-------------|
| `NEO4J_URI` | Neo4j connection URI |
| `NEO4J_USER` | Neo4j username |
| `NEO4J_PASSWORD` | Neo4j password |
| `NEO4J_DATABASE` | Neo4j database name |
| `PGHOST` | PostgreSQL host |
| `PGPORT` | PostgreSQL port |
| `PGDATABASE` | PostgreSQL database |
| `PGUSER` | PostgreSQL username |
| `PGPASSWORD` | PostgreSQL password |
| `DATABASE_URL` | PostgreSQL connection URL |
| `AGENT_ENDPOINT` | Remote agent service URL |
| `AGENT_API_KEY` | Agent service API key |
| `INTELGRAPH_CONFIG` | Config file path |
| `DEBUG` | Enable debug output |

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
