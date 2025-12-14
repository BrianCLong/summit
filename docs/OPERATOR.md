# Graph Consistency Operator Guide

## Overview

This guide explains how to manually operate the Graph Consistency Validator to diagnose and fix drift between Postgres and Neo4j.

## Diagnostics

To run a read-only check and see a report in the console:

```bash
# Run from server root
npx tsx src/scripts/check-graph-drift.ts
```

To generate a JSON report for analysis:

```bash
npx tsx src/scripts/check-graph-drift.ts --json --output ./drift-report.json
```

## Remediation

### Scenario 1: Missing Nodes in Graph
**Symptom**: Search results are missing entities that exist in the database.
**Fix**: Run with auto-repair.

```bash
npx tsx src/scripts/check-graph-drift.ts --auto-repair
```

### Scenario 2: Ghost / Orphan Nodes
**Symptom**: Graph queries return nodes that don't exist in the UI/Database.
**Fix**: Run with prune-orphans (Destructive!).

```bash
npx tsx src/scripts/check-graph-drift.ts --prune-orphans
```

### Scenario 3: Full Synchronization
**Symptom**: Major inconsistency or disaster recovery.
**Fix**: Run both flags.

```bash
npx tsx src/scripts/check-graph-drift.ts --auto-repair --prune-orphans
```

## Monitoring

Check the Grafana dashboard "Graph Health" or query Prometheus for:
*   `graph_drift_count`
*   `graph_orphan_nodes_count`
*   `graph_missing_nodes_count`
