# Graph Data Migration Guide

This guide describes how to migrate graph data between Neo4j environments or
from JanusGraph into Neo4j using the Summit graph migration toolkit. The tools
ship as Python scripts under `tools/graph_migration` and are integrated with the
workflow engine so migrations can be automated across environments.

## Prerequisites

- Python 3.10+ available on the host executing the migration commands.
- APOC installed on the source and target Neo4j clusters (the generated Cypher
  uses `apoc.export.csv.query`, `apoc.load.csv`, and `apoc.merge.relationship`).
- Network access between the migration runner and each Neo4j instance.
- For JanusGraph sources: the ability to export data in GraphSON format.

## CLI Overview

Run the CLI via `python -m tools.graph_migration.cli <command> [options]`. The
main commands are:

| Command | Description |
| --- | --- |
| `plan` | Produce a JSON migration plan including export/import Cypher and metadata. |
| `export` | Generate Cypher statements that export nodes/relationships to CSV via APOC. |
| `import` | Generate Cypher statements that import the exported CSV artifacts into a target Neo4j instance. |
| `translate-janusgraph` | Convert a JanusGraph GraphSON export to Cypher `UNWIND` statements for Neo4j. |
| `workflow` | Emit a workflow-engine action step configuration that executes the CLI automatically. |

All commands require a source and target connection definition:

```bash
python -m tools.graph_migration.cli plan \
  --source-type neo4j --source-uri bolt://neo4j-src:7687 --source-database neo4j \
  --target-type neo4j --target-uri bolt://neo4j-dst:7687 --target-database neo4j \
  --label Person --relationship-type KNOWS --id-property uuid
```

Flags such as `--label`, `--relationship-type`, and `--id-property` scope the
export and control how stable identifiers are generated. By default the tool
uses `migration_id` and falls back to `id(n)` when the property is missing.

### Export and Import Cypher

- **Export** writes two statements that call `apoc.export.csv.query` to produce
  `<prefix>_nodes.csv` and `<prefix>_relationships.csv`. The files include JSON
  serialised labels, properties, and relationship metadata.
- **Import** generates `apoc.load.csv` statements that recreate nodes and
  relationships while preserving the chosen identifier property. Relationships
  are merged using a synthetic `migrationRelKey` to keep the process idempotent.

Example export invocation:

```bash
python -m tools.graph_migration.cli export \
  --source-type neo4j --source-uri bolt://neo4j-src:7687 \
  --target-type neo4j --target-uri bolt://neo4j-dst:7687 \
  --output-prefix customer_graph
```

Example import invocation targeting a separate database:

```bash
python -m tools.graph_migration.cli import \
  --source-type neo4j --source-uri bolt://neo4j-src:7687 \
  --target-type neo4j --target-uri bolt://neo4j-dst:7687 \
  --database analytics \
  --nodes-file customer_graph_nodes.csv \
  --relationships-file customer_graph_relationships.csv
```

### JanusGraph Translation

Export the JanusGraph data to GraphSON, then translate it to Cypher:

```bash
# JanusGraph Gremlin console
# :> graph.io(graphson()).writeGraph('janus-export.json')

python -m tools.graph_migration.cli translate-janusgraph \
  --graphson janus-export.json \
  --id-property janus_id \
  --output janus-migration.cypher
```

The generated Cypher uses `apoc.create.setLabels` and
`apoc.merge.relationship` to map JanusGraph vertices and edges into Neo4j while
preserving the exported identifier property.

## Workflow Engine Integration

The workflow engine understands a new `graph-migration` action type that wraps
the CLI. Define a workflow step using the CLI-generated snippet or by hand:

```json
{
  "id": "step-graph-migration",
  "name": "Sync graph to production",
  "type": "action",
  "config": {
    "actionType": "graph-migration",
    "actionConfig": {
      "command": "plan",
      "pythonPath": "python3",
      "source": {
        "type": "neo4j",
        "uri": "bolt://neo4j-src:7687",
        "database": "neo4j"
      },
      "target": {
        "type": "neo4j",
        "uri": "bolt://neo4j-dst:7687",
        "database": "neo4j"
      },
      "options": {
        "labels": ["Person"],
        "relationshipTypes": ["KNOWS"],
        "outputPrefix": "customer_graph",
        "idProperty": "uuid"
      }
    }
  }
}
```

During execution the workflow engine spawns `python -m tools.graph_migration.cli`
from the repository root and captures stdout/stderr. The `stdout` payload is
parsed as JSON when possible (for example, the `plan` command), and the result is
stored with the workflow execution details.

### Automating Migration Runs

1. Schedule the migration workflow in staging to validate the generated plan.
2. Promote the workflow definition to production once the plan is reviewed.
3. Attach approval or notification steps before the graph migration action when
   running in critical environments.
4. Store generated CSV artifacts in secure storage (for example, S3) between the
   export and import phases if the migration spans clusters or networks.

## Operational Considerations

- **Security**: credentials are supplied via workflow variables or environment
  secrets—do not hard-code passwords in workflow definitions.
- **Idempotency**: the import step merges using a deterministic key, so reruns
  will update existing relationships rather than duplicating them.
- **Observability**: enable APOC logging on the Neo4j servers to monitor export
  and import throughput. The workflow engine logs include the CLI stdout/stderr
  for post-run analysis.
- **Testing**: use the pytest suite (`pytest tests/tools/test_graph_migration.py`)
  to validate customisations to the migration toolkit.

For questions or enhancements, contact the data platform engineering team.
