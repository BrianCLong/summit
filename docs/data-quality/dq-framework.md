# Data Quality (DQ) Enforcement Framework

## Overview

This document outlines the framework for defining, enforcing, and reporting on data quality rules within the IntelGraph/Maestro platform. The goal is to ensure data integrity across core entities (nodes, edges, runs, tenants) by catching violations early (in CI) or via scheduled checks.

## Architecture

The framework consists of:

1.  **Rule Definitions**: A declarative YAML file (`data-quality/rules.yml`) containing all active DQ rules.
2.  **Execution Engine**: A script (`scripts/data-quality/run-dq-checks.ts`) that reads the rules and executes them against the target database(s) (PostgreSQL and Neo4j).
3.  **CI Integration**: A GitHub Actions workflow that runs the checks against a non-prod database snapshot.

## Rule Categories

Rules are categorized to help with organization and reporting:

- **Schema**: Basic validity checks (e.g., non-null fields, correct data types) that might not be strictly enforced by the DB schema.
- **Reference**: Referential integrity checks (e.g., ensuring foreign keys exist, no orphaned records).
- **Semantic**: Business logic rules (e.g., valid state transitions, no cycles in specific graph structures).
- **Uniqueness**: Ensuring uniqueness constraints where DB constraints might be missing or insufficient.

## Severity Levels

Each rule is assigned a severity level:

- **BLOCKER**: Critical violations that indicate a broken system state. These **fail the CI pipeline**.
- **WARN**: Important issues that should be fixed but don't immediately break the build. These produce warnings/annotations in PRs.

## How to Add New Rules

1.  Open `data-quality/rules.yml`.
2.  Add a new entry under the `rules` list.
3.  Define the `id` (e.g., `DQ-00X`), `entity`, `type`, `severity`, and `description`.
4.  Define the implementation:
    - For **PostgreSQL**, provide a `sql` query that returns violating rows.
    - For **Neo4j**, provide a `cypher` query that returns violating nodes/relationships.
    - (Future) For code-based checks, provide a handler function name.

Example:

```yaml
- id: DQ-101
  entity: edge
  type: reference
  severity: BLOCKER
  description: "Edges must connect two existing nodes."
  backend: neo4j
  query: |
    MATCH (a)-[r]->(b)
    WHERE NOT (a:Node) OR NOT (b:Node)
    RETURN id(r) as violation_id, type(r) as details
```

## Running Checks Locally

To run the DQ checks against your local development environment:

```bash
# Make sure your dev DBs are running
npm run dq:check
# OR directly via the script
npx tsx scripts/data-quality/run-dq-checks.ts
```

## Reporting

The execution script generates:

- `reports/dq-report.json`: detailed machine-readable report.
- `reports/dq-report.md`: human-readable summary.
