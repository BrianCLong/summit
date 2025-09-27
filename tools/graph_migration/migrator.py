"""Core migration utilities for graph databases.

The :class:`GraphMigrator` helps build consistent Cypher statements for
exporting and importing graph data between Neo4j instances. It also produces
plan metadata that can be consumed by automation, including the workflow engine.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import textwrap
from typing import Any, Dict, List, Optional, Sequence
from uuid import uuid4

SUPPORTED_GRAPH_TYPES = {"neo4j", "janusgraph"}


@dataclass
class GraphConnectionConfig:
    """Connection description for a graph system."""

    type: str
    uri: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    database: Optional[str] = None
    graphson_path: Optional[str] = None
    options: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.type not in SUPPORTED_GRAPH_TYPES:
            raise ValueError(
                f"Unsupported graph type '{self.type}'. Expected one of {sorted(SUPPORTED_GRAPH_TYPES)}."
            )

    def to_payload(self) -> Dict[str, Any]:
        payload = {
            "type": self.type,
            "uri": self.uri,
            "username": self.username,
            "password": self.password,
            "database": self.database,
            "graphsonPath": self.graphson_path,
            "options": self.options or None,
        }
        return {k: v for k, v in payload.items() if v is not None}


@dataclass
class GraphMigrationOptions:
    """Tuning knobs for a migration operation."""

    labels: Optional[List[str]] = None
    relationship_types: Optional[List[str]] = None
    output_prefix: str = "graph_migration"
    output_dir: Optional[str] = None
    input_dir: Optional[str] = None
    plan_file: Optional[str] = None
    id_property: str = "migration_id"
    dry_run: bool = False
    concurrency: int = 4
    context: Dict[str, Any] = field(default_factory=dict)
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_payload(self) -> Dict[str, Any]:
        payload = {
            "labels": self.labels,
            "relationshipTypes": self.relationship_types,
            "outputPrefix": self.output_prefix,
            "outputDir": self.output_dir,
            "inputDir": self.input_dir,
            "planFile": self.plan_file,
            "idProperty": self.id_property,
            "dryRun": self.dry_run,
            "concurrency": self.concurrency,
            "context": self.context or None,
            "extra": self.extra or None,
        }
        return {k: v for k, v in payload.items() if v not in (None, [], {})}


@dataclass
class GraphMigrationPlan:
    """Structured summary of a migration."""

    source: GraphConnectionConfig
    target: GraphConnectionConfig
    options: GraphMigrationOptions
    export_statements: str
    import_statements: str
    steps: List[Dict[str, Any]]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source.to_payload(),
            "target": self.target.to_payload(),
            "options": self.options.to_payload(),
            "exportStatements": self.export_statements.strip(),
            "importStatements": self.import_statements.strip(),
            "steps": self.steps,
            "metadata": self.metadata,
        }


class GraphMigrator:
    """Generate Cypher statements to move graph data between environments."""

    def __init__(
        self,
        source: GraphConnectionConfig,
        target: GraphConnectionConfig,
        *,
        options: Optional[GraphMigrationOptions] = None,
    ) -> None:
        self.source = source
        self.target = target
        self.options = options or GraphMigrationOptions()

    # ------------------------------------------------------------------
    # Cypher generation helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _normalize_labels(labels: Optional[Sequence[str]]) -> List[str]:
        if not labels:
            return []
        return [label for label in labels if label]

    @staticmethod
    def _normalize_relationships(rel_types: Optional[Sequence[str]]) -> List[str]:
        if not rel_types:
            return []
        return [rel for rel in rel_types if rel]

    @staticmethod
    def _escape_identifier(identifier: str) -> str:
        escaped = identifier.replace("`", "``")
        return f"`{escaped}`"

    def _format_node_pattern(self, labels: Sequence[str], variable: str = "n") -> str:
        if not labels:
            return f"({variable})"
        label_clause = "".join(f":{self._escape_identifier(label)}" for label in labels)
        return f"({variable}{label_clause})"

    def _format_relationship(self, rel_types: Sequence[str]) -> str:
        if not rel_types:
            return "-[r]->"
        escaped = [self._escape_identifier(rel) for rel in rel_types]
        return f"-[r:{'|'.join(escaped)}]->"

    def _identity_expression(self, variable: str) -> str:
        property_access = f"{variable}.{self._escape_identifier(self.options.id_property)}"
        return f"CASE WHEN exists({property_access}) THEN {property_access} ELSE id({variable}) END"

    def _export_options_map(self) -> str:
        return "{batchSize: 20000, stream: false, format: 'csv'}"

    def generate_export_cypher(
        self,
        *,
        labels: Optional[Sequence[str]] = None,
        relationship_types: Optional[Sequence[str]] = None,
        output_prefix: Optional[str] = None,
    ) -> str:
        """Build Cypher statements to export nodes and relationships."""

        resolved_labels = self._normalize_labels(labels or self.options.labels)
        resolved_relationships = self._normalize_relationships(
            relationship_types or self.options.relationship_types
        )
        prefix = output_prefix or self.options.output_prefix

        node_pattern = self._format_node_pattern(resolved_labels, "n")
        relationship_pattern = self._format_relationship(resolved_relationships)

        node_id_expr = f"toString({self._identity_expression('n')})"
        start_id_expr = f"toString({self._identity_expression('start')})"
        end_id_expr = f"toString({self._identity_expression('end')})"

        node_query = textwrap.dedent(
            f"""
            MATCH {node_pattern}
            RETURN {node_id_expr} AS migrationKey,
                   apoc.convert.toJson(labels(n)) AS labelsJson,
                   apoc.convert.toJson(properties(n)) AS propsJson
            """
        ).strip()

        relationship_query = textwrap.dedent(
            f"""
            MATCH (start){relationship_pattern}(end)
            WITH r, start, end
            RETURN {start_id_expr} AS startKey,
                   {end_id_expr} AS endKey,
                   type(r) AS type,
                   apoc.convert.toJson(properties(r)) AS propsJson,
                   apoc.util.md5(type(r) + ':' + {start_id_expr} + ':' + {end_id_expr} + ':' + apoc.convert.toJson(properties(r))) AS relKey
            """
        ).strip()

        nodes_file = f"{prefix}_nodes.csv"
        relationships_file = f"{prefix}_relationships.csv"

        export_statements = textwrap.dedent(
            f"""
            CALL apoc.export.csv.query(\"{_compact_cypher(node_query)}\", \"{nodes_file}\", {self._export_options_map()});
            CALL apoc.export.csv.query(\"{_compact_cypher(relationship_query)}\", \"{relationships_file}\", {self._export_options_map()});
            """
        ).strip()

        return export_statements

    def generate_import_cypher(
        self,
        *,
        nodes_file: Optional[str] = None,
        relationships_file: Optional[str] = None,
        database: Optional[str] = None,
    ) -> str:
        """Build Cypher statements that re-create nodes and relationships."""

        prefix = self.options.output_prefix
        nodes_file = nodes_file or f"{prefix}_nodes.csv"
        relationships_file = relationships_file or f"{prefix}_relationships.csv"
        id_property = self._escape_identifier(self.options.id_property)

        node_import = textwrap.dedent(
            f"""
            CALL apoc.load.csv('file:///{nodes_file}') YIELD map AS row
            WITH row, apoc.convert.fromJsonList(row.labelsJson) AS labels,
                 apoc.convert.fromJsonMap(row.propsJson) AS props
            MERGE (n {{{id_property}: row.migrationKey}})
            CALL apoc.create.setLabels(n, labels) YIELD node
            SET node += props,
                node.{id_property} = row.migrationKey;
            """
        ).strip()

        relationship_import = textwrap.dedent(
            f"""
            CALL apoc.load.csv('file:///{relationships_file}') YIELD map AS row
            MERGE (start {{{id_property}: row.startKey}})
            MERGE (end {{{id_property}: row.endKey}})
            CALL apoc.merge.relationship(
              start,
              row.type,
              {{migrationRelKey: row.relKey}},
              apoc.convert.fromJsonMap(row.propsJson),
              end,
              {{migrationRelKey: row.relKey}},
              {{migrationRelKey: row.relKey}}
            ) YIELD rel
            SET rel += apoc.convert.fromJsonMap(row.propsJson);
            """
        ).strip()

        use_clause = f"USE {self._escape_identifier(database)}\n" if database else ""

        import_statements = textwrap.dedent(
            f"""
            {use_clause}CALL {{
              {textwrap.indent(node_import, '  ')}
            }};
            {use_clause}CALL {{
              {textwrap.indent(relationship_import, '  ')}
            }};
            """
        ).strip()

        return import_statements

    def build_plan(self) -> GraphMigrationPlan:
        """Create a high-level migration plan description."""

        export_statements = self.generate_export_cypher()
        import_statements = self.generate_import_cypher()

        steps: List[Dict[str, Any]] = [
            {
                "name": "Export graph data",
                "command": "apoc.export.csv.query",
                "artifacts": {
                    "nodes": f"{self.options.output_prefix}_nodes.csv",
                    "relationships": f"{self.options.output_prefix}_relationships.csv",
                },
            },
            {
                "name": "Transfer export artifacts",
                "command": "secure-copy",
                "details": "Move generated CSV files to the target environment.",
            },
            {
                "name": "Import into target graph",
                "command": "apoc.load.csv",
                "details": "Run generated Cypher to rehydrate nodes and relationships.",
            },
        ]

        metadata = {
            "idProperty": self.options.id_property,
            "dryRun": self.options.dry_run,
            "concurrency": self.options.concurrency,
        }

        return GraphMigrationPlan(
            source=self.source,
            target=self.target,
            options=self.options,
            export_statements=export_statements,
            import_statements=import_statements,
            steps=steps,
            metadata=metadata,
        )


def build_workflow_action(
    name: str,
    *,
    source: GraphConnectionConfig,
    target: GraphConnectionConfig,
    options: Optional[GraphMigrationOptions] = None,
    command: str = "plan",
    description: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a workflow-engine action step for automated migrations."""

    opts = options or GraphMigrationOptions()
    step_id = str(uuid4())
    action_config = {
        "command": command,
        "source": source.to_payload(),
        "target": target.to_payload(),
        "options": opts.to_payload(),
    }
    step_description = description or "Automated graph migration action"

    return {
        "id": step_id,
        "name": name,
        "type": "action",
        "description": step_description,
        "config": {
            "actionType": "graph-migration",
            "actionConfig": action_config,
        },
    }


def _compact_cypher(query: str) -> str:
    """Collapse whitespace to safely embed Cypher inside quotes."""

    return " ".join(part for part in query.split())
