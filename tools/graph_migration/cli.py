"""CLI for Summit graph migration tooling."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Optional

from .janusgraph import JanusGraphTranslator
from .migrator import (
    GraphConnectionConfig,
    GraphMigrator,
    GraphMigrationOptions,
    build_workflow_action,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate Cypher plans for migrating graph data between environments.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    plan_parser = subparsers.add_parser("plan", help="Create a migration plan with Cypher statements")
    _add_connection_args(plan_parser, "source")
    _add_connection_args(plan_parser, "target")
    _add_common_options(plan_parser)
    plan_parser.add_argument("--output", type=Path, help="Write the plan JSON to a file")
    plan_parser.set_defaults(func=_handle_plan)

    export_parser = subparsers.add_parser("export", help="Generate export Cypher statements")
    _add_connection_args(export_parser, "source")
    _add_connection_args(export_parser, "target")
    _add_common_options(export_parser)
    export_parser.add_argument("--output", type=Path, help="Write the export statements to a file")
    export_parser.set_defaults(func=_handle_export)

    import_parser = subparsers.add_parser("import", help="Generate import Cypher statements")
    _add_connection_args(import_parser, "source")
    _add_connection_args(import_parser, "target")
    _add_common_options(import_parser)
    import_parser.add_argument("--nodes-file", help="Override the nodes CSV file name")
    import_parser.add_argument("--relationships-file", help="Override the relationships CSV file name")
    import_parser.add_argument("--database", help="Target Neo4j database for USE clause")
    import_parser.add_argument("--output", type=Path, help="Write the import statements to a file")
    import_parser.set_defaults(func=_handle_import)

    translate_parser = subparsers.add_parser(
        "translate-janusgraph", help="Translate JanusGraph GraphSON exports to Cypher",
    )
    translate_parser.add_argument("--graphson", required=True, help="Path to a GraphSON export file")
    translate_parser.add_argument(
        "--id-property",
        default="migration_id",
        help="Node property that will store the stable identifier",
    )
    translate_parser.add_argument("--output", type=Path, help="Write the Cypher statements to a file")
    translate_parser.set_defaults(func=_handle_translate)

    workflow_parser = subparsers.add_parser(
        "workflow", help="Generate workflow-engine step configuration for a migration action",
    )
    _add_connection_args(workflow_parser, "source")
    _add_connection_args(workflow_parser, "target")
    _add_common_options(workflow_parser)
    workflow_parser.add_argument("--name", required=True, help="Workflow step name")
    workflow_parser.add_argument("--description", help="Optional step description")
    workflow_parser.add_argument(
        "--command",
        choices=["plan", "export", "import", "translate-janusgraph"],
        default="plan",
        help="CLI command that will be executed by the workflow action",
    )
    workflow_parser.add_argument("--output", type=Path, help="Write the workflow JSON to a file")
    workflow_parser.set_defaults(func=_handle_workflow)

    return parser


# ---------------------------------------------------------------------------
# Argument helpers
# ---------------------------------------------------------------------------


def _add_connection_args(parser: argparse.ArgumentParser, prefix: str) -> None:
    parser.add_argument(f"--{prefix}-type", required=True, choices=["neo4j", "janusgraph"], help=f"Type of the {prefix} graph")
    parser.add_argument(f"--{prefix}-uri", help=f"{prefix.title()} Neo4j bolt URI")
    parser.add_argument(f"--{prefix}-username", help=f"{prefix.title()} database username")
    parser.add_argument(f"--{prefix}-password", help=f"{prefix.title()} database password")
    parser.add_argument(f"--{prefix}-database", help=f"{prefix.title()} Neo4j database name")
    parser.add_argument(
        f"--{prefix}-graphson",
        help=f"Path to a GraphSON export when the {prefix} database is JanusGraph",
    )
    parser.add_argument(
        f"--{prefix}-options",
        help=f"JSON object with additional {prefix} connection options (pass '@file.json' to load from file)",
    )


def _add_common_options(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--label", dest="labels", action="append", help="Filter exported nodes by label")
    parser.add_argument(
        "--relationship-type",
        dest="relationship_types",
        action="append",
        help="Filter exported relationships by type",
    )
    parser.add_argument(
        "--output-prefix",
        default="graph_migration",
        help="Prefix used for generated CSV files",
    )
    parser.add_argument("--output-dir", help="Directory for generated artifacts")
    parser.add_argument("--input-dir", help="Directory containing existing artifacts")
    parser.add_argument("--plan-file", help="Path where the plan should be stored")
    parser.add_argument(
        "--id-property",
        default="migration_id",
        help="Node property that serves as the stable identifier",
    )
    parser.add_argument("--dry-run", action="store_true", help="Mark the plan as a dry run")
    parser.add_argument(
        "--concurrency",
        type=int,
        default=4,
        help="Hint for how many parallel workers should run the migration",
    )
    parser.add_argument(
        "--context",
        help="JSON object with execution context (use '@file.json' to load from disk)",
    )
    parser.add_argument(
        "--extra",
        help="JSON object with arbitrary metadata to include in the plan",
    )


def _parse_connection(args: argparse.Namespace, prefix: str) -> GraphConnectionConfig:
    options = _load_structured_arg(getattr(args, f"{prefix}_options", None), default={})
    return GraphConnectionConfig(
        type=getattr(args, f"{prefix}_type"),
        uri=getattr(args, f"{prefix}_uri", None),
        username=getattr(args, f"{prefix}_username", None),
        password=getattr(args, f"{prefix}_password", None),
        database=getattr(args, f"{prefix}_database", None),
        graphson_path=getattr(args, f"{prefix}_graphson", None),
        options=options,
    )


def _build_options(args: argparse.Namespace) -> GraphMigrationOptions:
    context = _load_structured_arg(args.context)
    extra = _load_structured_arg(args.extra)
    if context and not isinstance(context, dict):
        raise ValueError("Context payload must be a JSON object")
    if extra and not isinstance(extra, dict):
        raise ValueError("Extra payload must be a JSON object")
    return GraphMigrationOptions(
        labels=args.labels,
        relationship_types=args.relationship_types,
        output_prefix=args.output_prefix,
        output_dir=getattr(args, "output_dir", None),
        input_dir=getattr(args, "input_dir", None),
        plan_file=getattr(args, "plan_file", None),
        id_property=args.id_property,
        dry_run=args.dry_run,
        concurrency=args.concurrency,
        context=context,
        extra=extra,
    )


def _load_structured_arg(raw: Optional[str], *, default: Optional[Any] = None) -> Any:
    if raw is None:
        return {} if default is None else default
    text = raw
    if isinstance(raw, str) and raw.startswith("@"):
        text = Path(raw[1:]).read_text()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Failed to parse JSON payload: {exc}") from exc
    if parsed is None:
        return {}
    if isinstance(parsed, (dict, list)):
        return parsed
    raise ValueError("Expected JSON object or array")


def _write_output(payload: str, output: Optional[Path]) -> None:
    if output:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(payload + ("\n" if not payload.endswith("\n") else ""))
    else:
        print(payload)


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------


def _handle_plan(args: argparse.Namespace) -> int:
    migrator = GraphMigrator(
        source=_parse_connection(args, "source"),
        target=_parse_connection(args, "target"),
        options=_build_options(args),
    )
    plan = migrator.build_plan().to_dict()
    plan_json = json.dumps(plan, indent=2, sort_keys=True)
    _write_output(plan_json, args.output)
    return 0


def _handle_export(args: argparse.Namespace) -> int:
    migrator = GraphMigrator(
        source=_parse_connection(args, "source"),
        target=_parse_connection(args, "target"),
        options=_build_options(args),
    )
    statements = migrator.generate_export_cypher()
    _write_output(statements, args.output)
    return 0


def _handle_import(args: argparse.Namespace) -> int:
    migrator = GraphMigrator(
        source=_parse_connection(args, "source"),
        target=_parse_connection(args, "target"),
        options=_build_options(args),
    )
    statements = migrator.generate_import_cypher(
        nodes_file=args.nodes_file,
        relationships_file=args.relationships_file,
        database=args.database,
    )
    _write_output(statements, args.output)
    return 0


def _handle_translate(args: argparse.Namespace) -> int:
    translator = JanusGraphTranslator.from_file(args.graphson, id_property=args.id_property)
    statements = translator.to_cypher()
    _write_output(statements, args.output)
    return 0


def _handle_workflow(args: argparse.Namespace) -> int:
    options = _build_options(args)
    action = build_workflow_action(
        name=args.name,
        description=args.description,
        command=args.command,
        source=_parse_connection(args, "source"),
        target=_parse_connection(args, "target"),
        options=options,
    )
    action_json = json.dumps(action, indent=2, sort_keys=True)
    _write_output(action_json, args.output)
    return 0


def main(argv: Optional[list[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except ValueError as exc:  # pragma: no cover - defensive guard for CLI usage
        parser.error(str(exc))
        return 1


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
