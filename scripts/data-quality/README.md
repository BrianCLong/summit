# Summit Data Quality Monitoring Scripts

This directory contains scripts and configurations for monitoring the data quality of the Summit knowledge graph and associated relational data.

The scripts evaluate data against defined rules, generate data quality reports, and calculate graph density metrics, all without mutating any data (read-only).

## Components

- `run-dq-checks.ts`: The main executable script that loads the data quality rules, connects to the Postgres and Neo4j databases, runs the validations, collects graph metrics, and outputs the final reports.
- `../../data-quality/rules.yml`: The configuration file containing the data quality rules.

## Rules Configuration (`rules.yml`)

The rules are defined in YAML format and are categorized by backend (`neo4j` or `postgres`).

Each rule must contain the following fields:

- `id`: A unique identifier for the rule (e.g., `DQ-G-001`).
- `entity`: The type of entity being checked (e.g., `node`, `edge`, `run`, `tenant`).
- `type`: The category of the check (`schema`, `reference`, `semantic`, or `uniqueness`).
- `severity`: The impact level of a failure (`BLOCKER` or `WARN`). If a `BLOCKER` violation is found, the script will exit with a non-zero status code.
- `description`: A human-readable explanation of what the rule checks.
- `backend`: The target database (`neo4j` or `postgres`).
- `query`: The Cypher or SQL query that detects violations. The query **must** return exactly two columns:
  - `violation_id`: The ID of the failing entity (e.g., node ID, edge ID, row ID).
  - `details`: Additional context (e.g., labels, types, missing properties).

### Implemented Graph Checks

The default rules evaluate several critical graph quality conditions:
1. **Orphaned Nodes**: Nodes with no edges.
2. **Duplicate Entities**: Nodes with identical entity types and names but different node IDs.
3. **Broken Edges**: Edges pointing to missing nodes.
4. **Stale Nodes**: Nodes that haven't been updated within a configurable time window (default 30 days).
5. **Schema Violations**: Missing core properties such as `name` for nodes, or `weight`/`confidence` for edges.

### Graph Density Metrics

Beyond rules, the script automatically computes the following metrics for Neo4j:
- **Node Count**: Total number of nodes in the graph.
- **Edge Count**: Total number of relationships.
- **Average Degree**: Average number of connections per node.
- **Connected Components**: Number of isolated subnetworks (requires the GDS library in Neo4j).

## Usage

### Prerequisites

You need `npx` (and `tsx`) available in your environment to run the TypeScript script.
Ensure you have local or remote instances of Neo4j and Postgres running.

### Environment Variables

You can configure database connections using standard environment variables:

**Postgres:**
- `POSTGRES_HOST` (default: `localhost`)
- `POSTGRES_PORT` (default: `5432`)
- `POSTGRES_USER` (default: `postgres`)
- `POSTGRES_PASSWORD` (default: `postgres`)
- `POSTGRES_DB` (default: `intelgraph`)

**Neo4j:**
- `NEO4J_URI` (default: `bolt://localhost:7687`)
- `NEO4J_USER` (default: `neo4j`)
- `NEO4J_PASSWORD` (default: `password`)

### Running the Checks

Execute the script from the repository root:

```bash
npx tsx scripts/data-quality/run-dq-checks.ts
```

## Output

The script outputs results to the `reports/` directory in the repository root:

- `reports/dq-report.json`: A structured JSON file containing a summary of passed/failed rules, total violations, detailed violation records (up to a limit), and collected graph metrics. This file is ideal for programmatic parsing in CI/CD pipelines.
- `reports/dq-report.md`: A human-readable Markdown file summarizing the execution.

If any `BLOCKER` severity rule fails, the script returns an exit code of `1`.
